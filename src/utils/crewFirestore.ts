import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { CrewMember } from "../types/fleet";

const CREW_COL = "crew";

/** Subscribe to all active crew members (real-time). Returns unsubscribe function. */
export function subscribeToAllCrew(
  callback: (crew: Record<string, CrewMember>) => void,
): () => void {
  const q = query(collection(db, CREW_COL), where("status", "==", "active"));
  return onSnapshot(q, (snapshot) => {
    const result: Record<string, CrewMember> = {};
    snapshot.docs.forEach((d) => {
      result[d.id] = d.data() as CrewMember;
    });
    callback(result);
  });
}

/** Subscribe to crew for a specific ship (real-time). */
export function subscribeToShipCrew(
  shipId: string,
  callback: (crew: Record<string, CrewMember>) => void,
): () => void {
  const q = query(collection(db, CREW_COL), where("shipId", "==", shipId));
  return onSnapshot(q, (snapshot) => {
    const result: Record<string, CrewMember> = {};
    snapshot.docs.forEach((d) => {
      result[d.id] = d.data() as CrewMember;
    });
    callback(result);
  });
}

/** Get a single crew member by slug. */
export async function getCrewMember(crewId: string): Promise<CrewMember | null> {
  const snap = await getDoc(doc(db, CREW_COL, crewId));
  return snap.exists() ? (snap.data() as CrewMember) : null;
}

/** Claim a character. Uses transaction to prevent two users claiming simultaneously. */
export async function claimCharacter(
  crewId: string,
  userId: string,
  userEmail: string,
): Promise<void> {
  const docRef = doc(db, CREW_COL, crewId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists()) throw new Error("Character not found");
    const data = snap.data() as CrewMember;
    if (data.ownerId) throw new Error("Character already claimed");
    transaction.update(docRef, {
      ownerId: userId,
      ownerEmail: userEmail,
    });
  });
}

/** Create a new character document. Returns the slug used as doc ID. */
export async function createCharacter(
  slug: string,
  data: CrewMember,
): Promise<void> {
  await setDoc(doc(db, CREW_COL, slug), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

/** Update fields on an existing character. */
export async function updateCharacter(
  crewId: string,
  updates: Partial<CrewMember>,
): Promise<void> {
  await updateDoc(doc(db, CREW_COL, crewId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/** Admin: approve a pending character. */
export async function approveCharacter(crewId: string): Promise<void> {
  await updateDoc(doc(db, CREW_COL, crewId), { status: "active" });
}

/** Admin: reject/delete a pending character. */
export async function rejectCharacter(crewId: string): Promise<void> {
  await deleteDoc(doc(db, CREW_COL, crewId));
}

/** Admin: clear ownership from all crew owned by a specific user. */
export async function unclaimAllByUser(userId: string): Promise<number> {
  const q = query(collection(db, CREW_COL), where("ownerId", "==", userId));
  const snapshot = await import("firebase/firestore").then((m) => m.getDocs(q));
  const promises = snapshot.docs.map((d) =>
    updateDoc(d.ref, { ownerId: null, ownerEmail: null }),
  );
  await Promise.all(promises);
  return promises.length;
}

/** Seed Firestore from a crew data record. Used for initial data load. */
export async function seedCrewData(
  crewData: Record<string, CrewMember>,
): Promise<void> {
  const promises = Object.entries(crewData).map(([slug, member]) =>
    setDoc(doc(db, CREW_COL, slug), {
      ...member,
      ownerId: member.ownerId ?? null,
      ownerEmail: member.ownerEmail ?? null,
      status: member.status ?? "active",
      createdAt: serverTimestamp(),
    }),
  );
  await Promise.all(promises);
}
