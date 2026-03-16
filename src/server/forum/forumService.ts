/**
 * forumService.ts — Firestore-backed forum using the `forum` collection.
 * Separate from forumFirestore.ts (which uses `forumThreads` for the standalone Forum page).
 */
import {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import type { Mission } from "../../types/mission";

export type ForumCategory = "bridge" | "mission" | "engineering" | "sickbay" | "tenForward" | "holodeck";

export interface ShipForumThread {
  id?: string;
  shipId: string;
  category: ForumCategory;
  title: string;
  content: string;
  author: string;
  missionId?: string;
  createdAt?: unknown;
  lastActivity?: unknown;
}

const COLLECTION = "forum";

// ── Create ────────────────────────────────────────────────────────────────────

export async function createForumThread(
  thread: Omit<ShipForumThread, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...thread,
    createdAt: serverTimestamp(),
    lastActivity: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Creates a Mission Briefing thread in the `forum` collection for the given ship.
 * Skips if a thread for this missionId already exists on this ship.
 */
export async function createMissionThread(
  mission: Mission,
  shipId: string
): Promise<string | null> {
  if (!mission.id) return null;

  // Deduplicate
  const existing = await getDocs(
    query(
      collection(db, COLLECTION),
      where("shipId", "==", shipId),
      where("missionId", "==", mission.id)
    )
  );
  if (!existing.empty) return null;

  const objectives = mission.objectives?.map((o) => `• ${o}`).join("\n") ?? "";
  const content =
    `${mission.briefing}\n\n` +
    (objectives ? `Objectives:\n${objectives}\n\n` : "") +
    (mission.complication ? `Complication: ${mission.complication}\n` : "");

  return createForumThread({
    shipId,
    category: "mission",
    title: mission.title,
    content: content.trim(),
    author: "Starfleet Command",
    missionId: mission.id,
  });
}

// ── Read / Subscribe ──────────────────────────────────────────────────────────

export function subscribeToShipForumThreads(
  shipId: string,
  callback: (threads: ShipForumThread[]) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION), where("shipId", "==", shipId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShipForumThread)));
  });
}

export async function getShipThreads(shipId: string): Promise<ShipForumThread[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTION), where("shipId", "==", shipId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShipForumThread));
}

// ── Starter threads ───────────────────────────────────────────────────────────

/**
 * Seeds three default threads for a ship if none exist yet.
 * Call once on first load of a ship page.
 */
export async function ensureStarterThreads(
  shipId: string,
  shipName: string
): Promise<void> {
  const existing = await getDocs(
    query(collection(db, COLLECTION), where("shipId", "==", shipId))
  );
  if (!existing.empty) return;

  const starters: Omit<ShipForumThread, "id">[] = [
    {
      shipId,
      category: "bridge",
      title: `${shipName} — Bridge Communications`,
      content: `Official crew announcements and command-level communications for the ${shipName}.`,
      author: "Starfleet Command",
    },
    {
      shipId,
      category: "engineering",
      title: "Engineering Systems Log",
      content: `Log engineering reports, maintenance updates, and system status for the ${shipName}.`,
      author: "Chief Engineer",
    },
    {
      shipId,
      category: "sickbay",
      title: "Medical Log",
      content: `Submit medical reports, crew health updates, and sickbay notices for the ${shipName}.`,
      author: "Chief Medical Officer",
    },
    {
      shipId,
      category: "tenForward",
      title: "Welcome to Ten Forward",
      content: `Off-duty crew lounge. Relax, share stories, and enjoy your downtime aboard the ${shipName}.`,
      author: "Starfleet Command",
    },
    {
      shipId,
      category: "holodeck",
      title: "Holodeck Reservations & Programs",
      content: `Reserve holodeck time and share program recommendations with the crew of the ${shipName}.`,
      author: "Starfleet Command",
    },
  ];

  for (const thread of starters) {
    await createForumThread(thread);
  }
}
