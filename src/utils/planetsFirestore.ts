import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export interface PlanetRecord {
  name: string;
  description: string;
  resources: string[];
  logs: string[];
}

export async function getPlanet(slug: string): Promise<PlanetRecord | null> {
  const snap = await getDoc(doc(db, "planets", slug));
  if (!snap.exists()) return null;
  return snap.data() as PlanetRecord;
}

export async function deletePlanet(slug: string): Promise<void> {
  await deleteDoc(doc(db, "planets", slug));
}
