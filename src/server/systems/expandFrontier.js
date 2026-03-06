/**
 * expandFrontier.js
 * When a system is discovered, generate undiscovered neighbor systems
 * at the four cardinal coordinates if they don't already exist.
 */

import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
} from "firebase/firestore";

const CARDINAL_OFFSETS = [
  [1,  0],
  [-1, 0],
  [0,  1],
  [0, -1],
];

/**
 * Expand the map frontier around a newly-discovered system.
 *
 * @param {import("firebase/firestore").Firestore} db
 * @param {{ campaignId: string, x: number, y: number }} system
 */
export async function expandFrontier(db, system) {
  const { campaignId, x, y } = system;

  // Run each neighbor check in parallel for speed
  const tasks = CARDINAL_OFFSETS.map(async ([dx, dy]) => {
    const nx = x + dx;
    const ny = y + dy;

    // Check if a system already occupies this coordinate for this campaign
    const q = query(
      collection(db, "systems"),
      where("campaignId", "==", campaignId),
      where("x", "==", nx),
      where("y", "==", ny),
    );

    const snap = await getDocs(q);
    if (!snap.empty) return; // already exists — skip

    const systemId = crypto.randomUUID();
    await setDoc(doc(db, "systems", systemId), {
      systemId,
      campaignId,
      x: nx,
      y: ny,
      name: "Unknown System",
      discovered: false,
      details: null,
      createdAt: new Date().toISOString(),
    });
  });

  await Promise.all(tasks);
}
