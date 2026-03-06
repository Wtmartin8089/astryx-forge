import {
  collection,
  addDoc,
  doc,
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
  const q = query(
    threadsCol,
    where("boardId", "==", boardId),
    where("category", "==", category),
    orderBy("pinned", "desc"),
    orderBy("lastReplyAt", "desc"),
  );
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ForumThread),
    );
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
