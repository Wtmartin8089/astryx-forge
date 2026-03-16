import {
  collection,
  addDoc,
  doc,
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

export interface ForumThread {
  id: string;
  title: string;
  boardId: string;
  category: ForumCategoryId;
  author: string;
  authorUid: string;
  createdAt: Timestamp | null;
  lastReplyAt: Timestamp | null;
  replyCount: number;
  pinned: boolean;
  missionId?: string;
}

export interface ForumReply {
  id: string;
  content: string;
  author: string;
  authorUid: string;
  attachmentUrl: string;
  createdAt: Timestamp | null;
}

const threadsCol = collection(db, "forumThreads");

export function subscribeToThreads(
  boardId: string,
  category: ForumCategoryId,
  callback: (threads: ForumThread[]) => void,
): () => void {
  // No orderBy — avoids composite index requirement. Sort client-side.
  const q = query(
    threadsCol,
    where("boardId", "==", boardId),
    where("category", "==", category),
  );
  return onSnapshot(q, (snapshot) => {
    const threads = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ForumThread);
    // Pinned first, then most-recently-replied
    threads.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const aTime = a.lastReplyAt?.toDate?.()?.getTime() ?? 0;
      const bTime = b.lastReplyAt?.toDate?.()?.getTime() ?? 0;
      return bTime - aTime;
    });
    callback(threads);
  });
}

export async function createThread(
  boardId: string,
  category: ForumCategoryId,
  title: string,
  firstReplyContent: string,
  user: { email: string | null; uid: string },
): Promise<string> {
  const now = serverTimestamp();
  const authorName = user.email || "Anonymous";

  const threadRef = await addDoc(threadsCol, {
    title,
    boardId,
    category,
    author: authorName,
    authorUid: user.uid,
    createdAt: now,
    lastReplyAt: now,
    replyCount: 1,
    pinned: false,
  });

  await addDoc(collection(db, "forumThreads", threadRef.id, "replies"), {
    content: firstReplyContent,
    author: authorName,
    authorUid: user.uid,
    attachmentUrl: "",
    createdAt: now,
  });

  return threadRef.id;
}

export function subscribeToReplies(
  threadId: string,
  callback: (replies: ForumReply[]) => void,
): () => void {
  const q = query(
    collection(db, "forumThreads", threadId, "replies"),
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
  user: { email: string | null; uid: string },
): Promise<void> {
  const authorName = user.email || "Anonymous";

  await addDoc(collection(db, "forumThreads", threadId, "replies"), {
    content,
    author: authorName,
    authorUid: user.uid,
    attachmentUrl,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "forumThreads", threadId), {
    lastReplyAt: serverTimestamp(),
    replyCount: increment(1),
  });
}

/**
 * Creates a pinned Mission Briefing thread in the given ship's forum board.
 * Skips creation if a thread for this missionId already exists on that board.
 */
export async function createMissionBriefingThread(
  missionId: string,
  boardId: string,
  title: string,
  content: string,
): Promise<string | null> {
  // Avoid duplicate threads for the same mission on the same board
  const existing = await getDocs(
    query(threadsCol, where("boardId", "==", boardId), where("missionId", "==", missionId))
  );
  if (!existing.empty) return null;

  const now = serverTimestamp();
  const threadRef = await addDoc(threadsCol, {
    title,
    boardId,
    category: "missions" as ForumCategoryId,
    author: "STARFLEET COMMAND",
    authorUid: "STARFLEET_COMMAND",
    createdAt: now,
    lastReplyAt: now,
    replyCount: 1,
    pinned: true,
    missionId,
  });

  await addDoc(collection(db, "forumThreads", threadRef.id, "replies"), {
    content,
    author: "STARFLEET COMMAND",
    authorUid: "STARFLEET_COMMAND",
    attachmentUrl: "",
    createdAt: now,
  });

  return threadRef.id;
}

export function subscribeToThreadCounts(
  boardId: string,
  callback: (counts: Record<string, number>) => void,
): () => void {
  const q = query(threadsCol, where("boardId", "==", boardId));
  return onSnapshot(q, (snapshot) => {
    const counts: Record<string, number> = {};
    snapshot.docs.forEach((d) => {
      const cat = d.data().category as string;
      counts[cat] = (counts[cat] || 0) + 1;
    });
    callback(counts);
  });
}
