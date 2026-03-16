import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../../firebase/firebaseConfig";

export type Transmission = {
  id?: string;
  author: string;
  rank: string;
  location: string;
  title: string;
  message: string;
  stardate: number;
  timestamp: number;
  /** "*" = global broadcast (visible everywhere).
   *  A ship name = targeted to that ship only.
   *  Omit or use "*" for all new transmissions. */
  targetShip: string;
  priority?: "urgent" | "command" | "standard";
};

const COLLECTION = "fleet_transmissions";

function currentStardate(): number {
  const base = 74000;
  const baseTime = new Date("2026-01-01").getTime();
  const days = (Date.now() - baseTime) / (1000 * 60 * 60 * 24);
  return parseFloat((base + (days * 1000) / 365).toFixed(1));
}

export async function createTransmission(
  data: Omit<Transmission, "id" | "stardate" | "timestamp" | "targetShip"> & {
    targetShip?: string;
    priority?: "urgent" | "command" | "standard";
  }
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...data,
    targetShip: data.targetShip || "*",
    stardate: currentStardate(),
    timestamp: Date.now(),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTransmission(
  id: string,
  data: Partial<Omit<Transmission, "id">>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTransmission(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

/** Subscribe to all transmissions ordered newest first. */
export function subscribeToTransmissions(
  callback: (transmissions: Transmission[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    orderBy("timestamp", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transmission))
    );
  });
}
