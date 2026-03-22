/**
 * forumFirestore.ts
 * All forum data lives in the `forum` collection, keyed by `shipId`.
 * Category values match forumService.ts: "general" | "mission" | "engineering" | "lounge"
 */
import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { ForumCategoryId } from "../data/forumCategories";

const COLLECTION = "forum";

export interface ForumThread {
  id: string;
  title: string;
  shipId: string;   // was boardId — now matches the `forum` collection field
  boardId?: string; // legacy alias kept for compatibility
  category: ForumCategoryId;
  author: string;
  authorUid?: string;
  content?: string;
  createdAt: Timestamp | null;
  lastReplyAt: Timestamp | null;
  lastActivity?: Timestamp | null;
  replyCount: number;
  pinned: boolean;
  missionId?: string;
  type?: string;
  rank?: string;
  source?: string;
  classification?: "open" | "restricted" | "classified";
  relatedLocation?: string;
}

export interface ForumReply {
  id: string;
  content: string;
  author: string;
  authorUid: string;
  attachmentUrl: string;
  createdAt: Timestamp | null;
}

// ── Thread counts ─────────────────────────────────────────────────────────────

export function subscribeToThreadCounts(
  boardId: string,
  callback: (counts: Record<string, number>) => void,
): () => void {
  const q = query(collection(db, COLLECTION), where("shipId", "==", boardId));
  return onSnapshot(q, (snapshot) => {
    const counts: Record<string, number> = {};
    snapshot.docs.forEach((d) => {
      const cat = d.data().category as string;
      counts[cat] = (counts[cat] || 0) + 1;
    });
    console.log("[Forum] Thread counts for", boardId, counts);
    callback(counts);
  });
}

// ── Thread list ───────────────────────────────────────────────────────────────

export function subscribeToThreads(
  boardId: string,
  category: ForumCategoryId,
  callback: (threads: ForumThread[]) => void,
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where("shipId", "==", boardId),
    where("category", "==", category),
  );
  return onSnapshot(q, (snapshot) => {
    const threads = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ForumThread);
    console.log("Loaded forum threads:", threads);
    // Pinned first, then newest
    threads.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const aTime = (a.lastReplyAt ?? a.lastActivity)?.toDate?.()?.getTime() ?? 0;
      const bTime = (b.lastReplyAt ?? b.lastActivity)?.toDate?.()?.getTime() ?? 0;
      return bTime - aTime;
    });
    callback(threads);
  });
}

// ── Create thread (user-initiated) ────────────────────────────────────────────

export async function createThread(
  boardId: string,
  category: ForumCategoryId,
  title: string,
  firstReplyContent: string,
  user: { email: string | null; uid: string; displayName?: string | null },
  options?: { classification?: "open" | "restricted" | "classified"; relatedLocation?: string },
): Promise<string> {
  const now = serverTimestamp();
  const authorName = user.displayName || user.email || "Anonymous";

  const threadRef = await addDoc(collection(db, COLLECTION), {
    title,
    shipId: boardId,
    category,
    author: authorName,
    authorUid: user.uid,
    content: firstReplyContent,
    createdAt: now,
    lastReplyAt: now,
    lastActivity: now,
    replyCount: 1,
    pinned: false,
    classification: options?.classification || "open",
    ...(options?.relatedLocation ? { relatedLocation: options.relatedLocation } : {}),
  });

  await addDoc(collection(db, COLLECTION, threadRef.id, "replies"), {
    content: firstReplyContent,
    author: authorName,
    authorUid: user.uid,
    attachmentUrl: "",
    createdAt: now,
  });

  return threadRef.id;
}

// ── Replies ───────────────────────────────────────────────────────────────────

export function subscribeToReplies(
  threadId: string,
  callback: (replies: ForumReply[]) => void,
): () => void {
  const q = query(
    collection(db, COLLECTION, threadId, "replies"),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ForumReply),
    );
  });
}

export async function addReply(
  threadId: string,
  content: string,
  attachmentUrl: string,
  user: { email: string | null; uid: string; displayName?: string | null },
): Promise<void> {
  const authorName = user.displayName || user.email || "Anonymous";

  await addDoc(collection(db, COLLECTION, threadId, "replies"), {
    content,
    author: authorName,
    authorUid: user.uid,
    attachmentUrl,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, COLLECTION, threadId), {
    lastReplyAt: serverTimestamp(),
    lastActivity: serverTimestamp(),
    replyCount: increment(1),
  });
}

export async function editReply(
  threadId: string,
  replyId: string,
  newContent: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, threadId, "replies", replyId), {
    content: newContent,
    editedAt: serverTimestamp(),
  });
}

export async function deleteReply(
  threadId: string,
  replyId: string,
): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, threadId, "replies", replyId));
  await updateDoc(doc(db, COLLECTION, threadId), {
    replyCount: increment(-1),
  });
}

// ── Legacy: createMissionBriefingThread (kept for backwards compat) ───────────
// New code should use createMissionThread() from forumService.ts instead.

export async function createMissionBriefingThread(
  missionId: string,
  boardId: string,
  title: string,
  content: string,
): Promise<string | null> {
  const existing = await getDocs(
    query(
      collection(db, COLLECTION),
      where("shipId", "==", boardId),
      where("missionId", "==", missionId),
    )
  );
  if (!existing.empty) return null;

  const now = serverTimestamp();
  const threadRef = await addDoc(collection(db, COLLECTION), {
    title,
    shipId: boardId,
    category: "mission" as ForumCategoryId,
    author: "STARFLEET COMMAND",
    authorUid: "STARFLEET_COMMAND",
    content,
    createdAt: now,
    lastReplyAt: now,
    lastActivity: now,
    replyCount: 1,
    pinned: true,
    missionId,
  });

  await addDoc(collection(db, COLLECTION, threadRef.id, "replies"), {
    content,
    author: "STARFLEET COMMAND",
    authorUid: "STARFLEET_COMMAND",
    attachmentUrl: "",
    createdAt: now,
  });

  return threadRef.id;
}
