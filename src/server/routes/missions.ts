/**
 * Mission service — Firestore-backed CRUD + generation.
 * This is a client-side service module (Vite SPA has no server).
 * Functions mirror a REST API shape: getMissions, getMission, generateAndStore.
 */
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import type { Mission, MissionStatus } from "../../types/mission";
import { generateMission } from "../missions/missionGenerator";

const COLLECTION = "missions";

// ── GET /api/missions ────────────────────────────────────────────────────────

export async function getMissions(): Promise<Mission[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTION), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Mission));
}

/** Real-time subscription — calls callback whenever the missions list changes. */
export function subscribeMissions(
  callback: (missions: Mission[]) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Mission)))
  );
}

// ── GET /api/missions/:id ────────────────────────────────────────────────────

export async function getMission(id: string): Promise<Mission | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Mission;
}

// ── POST /api/missions/generate ──────────────────────────────────────────────

export async function generateAndStoreMission(
  templateType?: string,
  systemName?: string
): Promise<Mission> {
  const mission = generateMission(templateType, systemName);
  const ref = await addDoc(collection(db, COLLECTION), {
    ...mission,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...mission };
}

// ── Additional helpers ───────────────────────────────────────────────────────

export async function createMission(
  mission: Omit<Mission, "id">
): Promise<Mission> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...mission,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...mission };
}

export async function updateMissionStatus(
  id: string,
  status: MissionStatus
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status });
}

export async function assignMissionToShip(
  id: string,
  shipName: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    assignedShip: shipName || null,
  });
}

export async function deleteMission(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

/** Seed all starter missions in one call. Skips if collection already has documents. */
export async function seedStarterMissions(
  missions: Omit<Mission, "id">[],
  force = false
): Promise<number> {
  if (!force) {
    const existing = await getDocs(collection(db, COLLECTION));
    if (!existing.empty) return 0;
  }
  let count = 0;
  for (const m of missions) {
    await addDoc(collection(db, COLLECTION), {
      ...m,
      createdAt: serverTimestamp(),
    });
    count++;
  }
  return count;
}
