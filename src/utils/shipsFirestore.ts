import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { ShipData } from "../types/fleet";
import defaultShipsJson from "../data/shipsData.json";

const SHIPS_COL = "ships";

/** Subscribe to all ships (real-time). Returns unsubscribe function. */
export function subscribeToShips(
  callback: (ships: Record<string, ShipData>) => void,
): () => void {
  const q = query(collection(db, SHIPS_COL));
  return onSnapshot(q, (snapshot) => {
    const result: Record<string, ShipData> = {};
    snapshot.docs.forEach((d) => {
      result[d.id] = d.data() as ShipData;
    });
    callback(result);
  });
}

/** Save (upsert) a ship document. */
export async function saveShip(slug: string, data: ShipData): Promise<void> {
  await setDoc(doc(db, SHIPS_COL, slug), { ...data, updatedAt: serverTimestamp() });
}

/** Update specific fields on a ship document. */
export async function updateShip(slug: string, updates: Partial<ShipData>): Promise<void> {
  await updateDoc(doc(db, SHIPS_COL, slug), { ...updates, updatedAt: serverTimestamp() });
}

/** Delete a ship document. */
export async function deleteShip(slug: string): Promise<void> {
  await deleteDoc(doc(db, SHIPS_COL, slug));
}

/**
 * One-time migration: if the ships collection is empty, seed it from
 * localStorage (if present) or from the default JSON data file.
 * Call this once on app startup.
 */
export async function migrateShipsToFirestore(): Promise<void> {
  const existing = await getDocs(query(collection(db, SHIPS_COL)));
  if (!existing.empty) return; // already seeded

  const stored = localStorage.getItem("shipsData");
  const source: Record<string, ShipData> = stored
    ? JSON.parse(stored)
    : (defaultShipsJson as unknown as Record<string, ShipData>);

  await Promise.all(
    Object.entries(source).map(([slug, data]) =>
      setDoc(doc(db, SHIPS_COL, slug), data),
    ),
  );
}
