/**
 * sensorDetection.js
 * Runs a sensor sweep for a ship positioned inside a sector.
 *
 * Detection rule:
 *   3D distance(ship, system) <= ship.sensorRange → explorationLevel 0 → 1
 *
 * Level 1 systems are revealed to the client as "Unknown stellar signature" only.
 * Star type, planets, and anomalies remain hidden until identifySystem / surveySystem.
 *
 * Charting percent = (systems with explorationLevel >= 1) / (total systems) × 100
 * Updated on the sector document after every sweep, supporting multiple ships.
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getServerDb } from "../firebase/serverDb.js";

// ─── Geometry ────────────────────────────────────────────────────────────────

/**
 * 3D Euclidean distance between two {x, y, z} coordinate objects.
 * @param {{ x: number, y: number, z: number }} a
 * @param {{ x: number, y: number, z: number }} b
 * @returns {number}
 */
export function distance3d(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ─── Charting ─────────────────────────────────────────────────────────────────

/**
 * Recomputes and persists sector charting percent.
 * Called after every sweep so that contributions from multiple ships accumulate.
 *
 * @param {import("firebase/firestore").Firestore} db
 * @param {string} sectorId
 * @param {string} campaignId
 * @returns {Promise<number>}  0–100, one decimal place
 */
export async function updateSectorCharting(db, sectorId, campaignId) {
  const snap = await getDocs(
    query(
      collection(db, "systems"),
      where("sectorId", "==", sectorId),
      where("campaignId", "==", campaignId),
    ),
  );

  const total = snap.size;
  if (!total) return 0;

  const detected = snap.docs.filter(
    (d) => (d.data().explorationLevel ?? 0) >= 1,
  ).length;

  const chartingPercent = parseFloat(((detected / total) * 100).toFixed(1));
  await updateDoc(doc(db, "sectors", sectorId), { chartingPercent });
  return chartingPercent;
}

// ─── Sanitization ─────────────────────────────────────────────────────────────

/**
 * Shape the client-safe payload for a level-1 (detected) system.
 * Returns only position + label — NO star type, NO planet info.
 *
 * @param {object} system  Raw system data merged with its Firestore id
 * @returns {object}
 */
function sanitizeDetected(system) {
  return {
    id:                system.id,
    explorationLevel:  1,
    label:             "Unknown stellar signature",
    xCoord:            system.xCoord,
    yCoord:            system.yCoord,
    zCoord:            system.zCoord,
    discoveredByShip:  system.discoveredByShip,
    discoveredStardate: system.discoveredStardate,
  };
}

// ─── Core sweep ──────────────────────────────────────────────────────────────

/**
 * Run a sensor sweep for a ship at a given 3D position within a sector.
 *
 * Any system that is:
 *   - in the same sector + campaign
 *   - at explorationLevel 0 (hidden)
 *   - within sensorRange of the ship
 *
 * will transition to explorationLevel 1 and be returned as a newly-detected contact.
 *
 * Already-detected systems (level >= 1) are ignored — this function never downgrades.
 * Multiple ships can call this independently; Firestore updates are additive.
 *
 * @param {object} params
 * @param {string} params.sectorId
 * @param {string} params.campaignId
 * @param {string} params.shipId
 * @param {number} params.shipX
 * @param {number} params.shipY
 * @param {number} params.shipZ
 * @param {number} params.sensorRange   World-unit radius
 * @returns {Promise<{ newlyDetected: object[], chartingPercent: number }>}
 */
export async function runSensorSweep({
  sectorId,
  campaignId,
  shipId,
  shipX,
  shipY,
  shipZ,
  sensorRange,
}) {
  const db = getServerDb();
  const shipPos = { x: shipX, y: shipY, z: shipZ };

  const snap = await getDocs(
    query(
      collection(db, "systems"),
      where("sectorId", "==", sectorId),
      where("campaignId", "==", campaignId),
    ),
  );

  const now = new Date().toISOString();
  const batch = writeBatch(db);
  const newlyDetected = [];

  for (const docSnap of snap.docs) {
    const system = docSnap.data();

    // Skip systems already discovered — never downgrade
    if ((system.explorationLevel ?? 0) > 0) continue;

    const systemPos = { x: system.xCoord, y: system.yCoord, z: system.zCoord };
    if (distance3d(shipPos, systemPos) <= sensorRange) {
      batch.update(docSnap.ref, {
        explorationLevel:   1,
        masked:             false,
        discoveredByShip:   shipId,
        discoveredStardate: now,
      });

      newlyDetected.push(
        sanitizeDetected({
          id: docSnap.id,
          ...system,
          discoveredByShip: shipId,
          discoveredStardate: now,
        }),
      );
    }
  }

  if (newlyDetected.length > 0) {
    await batch.commit();
  }

  // Recompute charting percent regardless — a prior ship may have added detections
  const chartingPercent = await updateSectorCharting(db, sectorId, campaignId);

  return { newlyDetected, chartingPercent };
}
