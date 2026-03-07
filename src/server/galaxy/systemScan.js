/**
 * systemScan.js
 * Identification scan: explorationLevel 1 → 2
 *
 * Precondition: system must already be detected (explorationLevel >= 1).
 * After scan: reveals star type and approximate planet count.
 *             Planet list, asteroid belts, and anomaly data remain hidden.
 *
 * Idempotent: if called on a system already at level >= 2, returns current data
 * without modifying anything.
 */

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getServerDb } from "../firebase/serverDb.js";

// ─── Sanitization ─────────────────────────────────────────────────────────────

/**
 * Client-safe payload for a level-2 (identified) system.
 * Reveals star type and approximate planet count.
 * Does NOT expose: planet list, asteroid belts, anomaly data, survey details.
 *
 * @param {object} system  Raw system data with id
 * @returns {object}
 */
export function sanitizeIdentified(system) {
  return {
    id:               system.id,
    explorationLevel: 2,
    provisionalName:  system.provisionalName,
    displayName:      system.displayName ?? null,
    starType:         system.starType,
    planetCount:      system.planetCount,
    xCoord:           system.xCoord,
    yCoord:           system.yCoord,
    zCoord:           system.zCoord,
    discoveredByShip:  system.discoveredByShip,
    discoveredStardate: system.discoveredStardate,
  };
}

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Perform an identification scan on a detected system.
 *
 * @param {string} systemId
 * @param {string} campaignId
 * @param {string} shipId
 * @returns {Promise<{ system: object, upgraded: boolean }>}
 * @throws  Error with .status 404 | 403 | 409
 */
export async function identifySystem(systemId, campaignId, shipId) {
  const db = getServerDb();
  const ref = doc(db, "systems", systemId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw Object.assign(new Error("System not found."), { status: 404 });
  }

  const system = snap.data();

  if (system.campaignId !== campaignId) {
    throw Object.assign(
      new Error("System does not belong to this campaign."),
      { status: 403 },
    );
  }

  if ((system.explorationLevel ?? 0) < 1) {
    throw Object.assign(
      new Error("System has not been detected. Run a sensor sweep first."),
      { status: 409 },
    );
  }

  // Idempotent — already at level 2 or beyond
  if ((system.explorationLevel ?? 0) >= 2) {
    return {
      system: sanitizeIdentified({ id: systemId, ...system }),
      upgraded: false,
    };
  }

  await updateDoc(ref, {
    explorationLevel: 2,
    identifiedByShip: shipId,
    identifiedAt:     new Date().toISOString(),
  });

  return {
    system: sanitizeIdentified({
      id: systemId,
      ...system,
      explorationLevel: 2,
    }),
    upgraded: true,
  };
}
