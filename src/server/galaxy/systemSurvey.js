/**
 * systemSurvey.js
 * System entry survey: explorationLevel → 3
 *
 * Triggered when a ship physically enters a system.
 * Precondition: system must have been detected (explorationLevel >= 1).
 * After survey: reveals planet list (class only), asteroid belt count,
 *               and anomaly presence. Individual planet details remain
 *               hidden until planet-level scans (surveyStatus progression).
 *
 * Idempotent: if called on a system already at level >= 3, returns current
 * data without modifying anything.
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { getServerDb } from "../firebase/serverDb.js";

// ─── Sanitization helpers ─────────────────────────────────────────────────────

/**
 * Planet payload at survey-level visibility.
 * Reveals orbital position and class only.
 * Life signs, gravity, atmosphere, resources etc. require planet scans.
 *
 * @param {object} planet  Raw planet data with id
 * @returns {object}
 */
function sanitizePlanetBasic(planet) {
  return {
    id:              planet.id,
    orbitalIndex:    planet.orbitalIndex,
    provisionalName: planet.provisionalName,
    planetClass:     planet.planetClass,
    surveyStatus:    planet.surveyStatus ?? 0,
  };
}

/**
 * Anomaly payload at survey-level visibility.
 * If the anomaly has not yet been investigated, type is masked behind
 * a generic "Anomalous reading detected" label.
 *
 * @param {object} anomaly  Raw anomaly data with id
 * @returns {object}
 */
function sanitizeAnomalyBasic(anomaly) {
  return {
    id:     anomaly.id,
    scale:  anomaly.scale,
    type:   (anomaly.investigationLevel ?? 0) > 0
              ? anomaly.type
              : "Anomalous reading detected",
    status: anomaly.status,
  };
}

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Survey a system when a ship enters it.
 *
 * @param {string} systemId
 * @param {string} campaignId
 * @param {string} shipId
 * @returns {Promise<{
 *   system:   object,
 *   planets:  object[],
 *   anomaly:  object|null,
 *   upgraded: boolean,
 * }>}
 * @throws  Error with .status 404 | 403 | 409
 */
export async function surveySystem(systemId, campaignId, shipId) {
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
      new Error("System has not been detected. Enter sensor range first."),
      { status: 409 },
    );
  }

  const upgraded = (system.explorationLevel ?? 0) < 3;

  if (upgraded) {
    await updateDoc(ref, {
      explorationLevel: 3,
      surveyedByShip:   shipId,
      surveyedAt:       new Date().toISOString(),
    });
  }

  // ── Fetch planets ordered by orbital index ──
  const planetSnap = await getDocs(
    query(
      collection(db, "planets"),
      where("systemId", "==", systemId),
      where("campaignId", "==", campaignId),
    ),
  );

  const planets = planetSnap.docs
    .map((d) => sanitizePlanetBasic({ id: d.id, ...d.data() }))
    .sort((a, b) => a.orbitalIndex - b.orbitalIndex);

  // ── Fetch anomaly if present ──
  let anomaly = null;
  if (system.anomalyPresent) {
    const anomalySnap = await getDocs(
      query(
        collection(db, "anomalies"),
        where("systemId", "==", systemId),
        where("campaignId", "==", campaignId),
      ),
    );
    if (!anomalySnap.empty) {
      const ad = anomalySnap.docs[0];
      anomaly = sanitizeAnomalyBasic({ id: ad.id, ...ad.data() });
    }
  }

  return {
    system: {
      id:               systemId,
      explorationLevel: 3,
      provisionalName:  system.provisionalName,
      displayName:      system.displayName ?? null,
      starType:         system.starType,
      planetCount:      system.planetCount,
      asteroidBelts:    system.asteroidBelts,
      anomalyPresent:   system.anomalyPresent,
      xCoord:           system.xCoord,
      yCoord:           system.yCoord,
      zCoord:           system.zCoord,
      discoveredByShip: system.discoveredByShip,
      surveyedByShip:   shipId,
    },
    planets,
    anomaly,
    upgraded,
  };
}
