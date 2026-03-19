import { doc, getDoc, deleteDoc, updateDoc, type WithFieldValue, type DocumentData } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export interface PlanetRecord {
  name: string;
  description: string;
  resources: string[];
  logs: string[];
  // TNG template fields (optional — filled in via edit)
  classification?: string;
  systemData?: string;
  gravity?: string;
  yearAndDay?: string;
  atmosphere?: string;
  hydrosphere?: string;
  climate?: string;
  sapientSpecies?: string;
  techLevel?: string;
  government?: string;
  culture?: string;
  affiliation?: string;
  placesOfNote?: string;
  shipFacilities?: string;
  otherDetail?: string;
}

export async function getPlanet(slug: string): Promise<PlanetRecord | null> {
  const snap = await getDoc(doc(db, "planets", slug));
  if (!snap.exists()) return null;
  return snap.data() as PlanetRecord;
}

export async function updatePlanet(slug: string, data: Partial<PlanetRecord>): Promise<void> {
  await updateDoc(doc(db, "planets", slug), data as WithFieldValue<DocumentData>);
}

export async function deletePlanet(slug: string): Promise<void> {
  await deleteDoc(doc(db, "planets", slug));
}
