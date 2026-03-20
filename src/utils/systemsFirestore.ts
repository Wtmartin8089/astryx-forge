import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// ─── Systems ──────────────────────────────────────────────────────────────────

export interface StarSystem {
  id?: string;
  name: string;
  region: string;
  sector: string;
  stellarClass: string;
  starType: string;
  numberOfStars: string;
  numberOfPlanets: string;
  allegiance: string;
  explorationStatus: string;
  hazards: string;
  notableFeatures: string;
  knownPlanets: string;
  description: string;
  createdBy: string;
  createdAt?: any;
}

export function subscribeToSystems(
  callback: (systems: StarSystem[]) => void,
): () => void {
  const q = query(collection(db, "systems"), orderBy("name"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StarSystem, "id">) })));
  });
}

export async function getSystem(id: string): Promise<StarSystem | null> {
  const snap = await getDoc(doc(db, "systems", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<StarSystem, "id">) };
}

export async function createSystem(
  data: Omit<StarSystem, "id" | "createdAt">,
): Promise<string> {
  const ref = await addDoc(collection(db, "systems"), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

// ─── System Planets ───────────────────────────────────────────────────────────

export interface SystemPlanet {
  id?: string;
  systemId: string;
  name: string;
  classification: string;
  systemData: string;
  gravity: string;
  yearAndDay: string;
  atmosphere: string;
  hydrosphere: string;
  climate: string;
  sapientSpecies: string;
  techLevel: string;
  government: string;
  culture: string;
  affiliation: string;
  resources: string;
  placesOfNote: string;
  shipFacilities: string;
  otherDetail: string;
  createdBy: string;
  createdAt?: any;
}

export function subscribeToSystemPlanets(
  systemId: string,
  callback: (planets: SystemPlanet[]) => void,
): () => void {
  const q = query(
    collection(db, "systemPlanets"),
    where("systemId", "==", systemId),
    orderBy("name"),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SystemPlanet, "id">) })));
  });
}

export async function getSystemPlanet(id: string): Promise<SystemPlanet | null> {
  const snap = await getDoc(doc(db, "systemPlanets", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<SystemPlanet, "id">) };
}

export async function createSystemPlanet(
  data: Omit<SystemPlanet, "id" | "createdAt">,
): Promise<string> {
  const ref = await addDoc(collection(db, "systemPlanets"), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

// ─── System Species ───────────────────────────────────────────────────────────

export interface SystemSpecies {
  id?: string;
  systemId: string;
  name: string;
  type: string;
  homeworld: string;
  biology: string;
  culture: string;
  notes: string;
  createdBy: string;
  createdAt?: any;
}

export function subscribeToSystemSpecies(
  systemId: string,
  callback: (species: SystemSpecies[]) => void,
): () => void {
  const q = query(
    collection(db, "systemSpecies"),
    where("systemId", "==", systemId),
    orderBy("name"),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SystemSpecies, "id">) })));
  });
}

export async function getSystemSpecies(id: string): Promise<SystemSpecies | null> {
  const snap = await getDoc(doc(db, "systemSpecies", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<SystemSpecies, "id">) };
}

export async function createSystemSpecies(
  data: Omit<SystemSpecies, "id" | "createdAt">,
): Promise<string> {
  const ref = await addDoc(collection(db, "systemSpecies"), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

// ─── System-scoped creatures helper ──────────────────────────────────────────
// (reads from existing "creatures" collection, filtered by systemId)
export async function getCreaturesBySystem(systemId: string) {
  const q = query(
    collection(db, "creatures"),
    where("systemId", "==", systemId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export function subscribeToCreaturesBySystem(
  systemId: string,
  callback: (creatures: any[]) => void,
): () => void {
  const q = query(collection(db, "creatures"), where("systemId", "==", systemId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
  });
}

/** Patch an existing creature with systemId (for linking via CreatureNew) */
export async function patchCreatureSystemId(creatureId: string, systemId: string): Promise<void> {
  await updateDoc(doc(db, "creatures", creatureId), { systemId });
}

export async function deleteSystemPlanet(id: string): Promise<void> {
  await deleteDoc(doc(db, "systemPlanets", id));
}

export async function deleteSystem(id: string): Promise<void> {
  await deleteDoc(doc(db, "systems", id));
}

/** Read all docs from the `planets` collection and create systemPlanet records under systemId. */
export async function importStarMapPlanets(systemId: string, createdBy: string): Promise<number> {
  const snap = await getDocs(collection(db, "planets"));
  let count = 0;
  for (const d of snap.docs) {
    const p = d.data() as any;
    await addDoc(collection(db, "systemPlanets"), {
      systemId,
      name: p.name || d.id,
      classification: p.classification || "",
      systemData: p.systemData || "",
      gravity: p.gravity || "",
      yearAndDay: p.yearAndDay || "",
      atmosphere: p.atmosphere || "",
      hydrosphere: p.hydrosphere || "",
      climate: p.climate || "",
      sapientSpecies: p.sapientSpecies || "",
      techLevel: p.techLevel || "",
      government: p.government || "",
      culture: p.culture || "",
      affiliation: p.affiliation || "",
      resources: Array.isArray(p.resources) ? p.resources.join(", ") : (p.resources || ""),
      placesOfNote: p.placesOfNote || "",
      shipFacilities: p.shipFacilities || "",
      otherDetail: p.otherDetail || p.description || "",
      createdBy,
      createdAt: serverTimestamp(),
    });
    count++;
  }
  return count;
}
