/**
 * scanSystem.js
 * Performs a sensor scan of the nearest unexplored system.
 * Scan gives hints only — full details require active exploration.
 */

import { collection, query, where, getDocs } from "firebase/firestore";
import { getServerDb } from "../firebase/serverDb.js";

/** Scan clarity weighted probabilities: clear(25%), partial(40%), distorted(25%), none(10%) */
const CLARITY_WEIGHTS = [
  { level: "clear",     weight: 25 },
  { level: "partial",   weight: 40 },
  { level: "distorted", weight: 25 },
  { level: "none",      weight: 10 },
];

function rollClarity() {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const { level, weight } of CLARITY_WEIGHTS) {
    cumulative += weight;
    if (roll < cumulative) return level;
  }
  return "partial";
}

/**
 * Find the nearest undiscovered system to the player's current position.
 * "Nearest" = smallest combined |dx|+|dy| distance from any discovered system.
 */
function findNearestFrontierSystem(systems) {
  const discovered  = systems.filter((s) => s.discovered);
  const undiscovered = systems.filter((s) => !s.discovered);

  if (undiscovered.length === 0) return null;
  if (discovered.length  === 0) return undiscovered[0];

  // Score each frontier system by minimum Manhattan distance to any discovered system
  return undiscovered.reduce((best, frontier) => {
    const minDist = discovered.reduce((d, disc) => {
      const dist = Math.abs(frontier.x - disc.x) + Math.abs(frontier.y - disc.y);
      return Math.min(d, dist);
    }, Infinity);

    const bestDist = discovered.reduce((d, disc) => {
      const dist = Math.abs(best.x - disc.x) + Math.abs(best.y - disc.y);
      return Math.min(d, dist);
    }, Infinity);

    return minDist < bestDist ? frontier : best;
  });
}

/**
 * Perform a sensor scan for the player's campaign.
 *
 * @param {{ boardId: string, playerId: string }} playerContext
 * @returns {Promise<{
 *   scanType: "clear"|"partial"|"distorted"|"none",
 *   systemId: string|null,
 *   systemCoords: { x: number, y: number }|null,
 *   distanceFromBase: number|null,
 *   totalFrontier: number
 * }>}
 */
export async function performSystemScan(playerContext) {
  const { boardId } = playerContext;
  const db = getServerDb();

  // Find campaign via unit name
  const unitsSnap = await getDocs(
    query(collection(db, "campaignUnits"), where("name", "==", boardId)),
  );
  if (unitsSnap.empty) {
    return { scanType: "none", systemId: null, systemCoords: null, distanceFromBase: null, totalFrontier: 0 };
  }

  const campaignId = unitsSnap.docs[0].data().campaignId;
  const sysSnap = await getDocs(
    query(collection(db, "systems"), where("campaignId", "==", campaignId)),
  );
  const systems = sysSnap.docs.map((d) => d.data());

  const frontier = systems.filter((s) => !s.discovered);
  const target   = findNearestFrontierSystem(systems);

  if (!target) {
    return { scanType: "none", systemId: null, systemCoords: null, distanceFromBase: null, totalFrontier: 0 };
  }

  // Distance from (0,0) base — cosmetic detail for the report
  const distanceFromBase = Math.round(
    Math.sqrt(target.x * target.x + target.y * target.y) * 10
  ) / 10;

  return {
    scanType:        rollClarity(),
    systemId:        target.systemId,
    systemCoords:    { x: target.x, y: target.y },
    distanceFromBase,
    totalFrontier:   frontier.length,
  };
}
