/**
 * warpEngine.js
 * Movement engine for ships traveling at warp.
 *
 * updateShipMovement() processes one 5-second tick for every ship with
 * travelStatus === "traveling". It is designed for Vercel serverless — there
 * is no persistent loop. The caller (pages/api/navigation/tick.js) is
 * responsible for scheduling via client-side polling or Vercel cron.
 *
 * Per tick:
 *   1. Find all traveling ships
 *   2. Compute direction vector → ship position → advance by warp step
 *   3. Persist new coordinates (never overshoot destination)
 *   4. Run sensor detection sweep at new position
 *   5. If destination reached → set travelStatus = "arrived"
 *   6. Roll for random en-route event
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  limit,
} from "firebase/firestore";
import { getServerDb } from "../firebase/serverDb.js";
import { runSensorSweep } from "../galaxy/sensorDetection.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Units per minute at each warp factor (simplified Cochrane model). */
const WARP_UNITS_PER_MIN = {
  1: 0.1,
  2: 0.25,
  3: 0.5,
  4: 0.75,
  5: 1.0,
  6: 1.5,
  7: 2.0,
  8: 3.0,
  9: 5.0,
};

/** Duration of one movement tick in seconds. */
const TICK_SECONDS = 5;
const TICK_MINUTES = TICK_SECONDS / 60;

/** Default sensor range used when the ship document has no sensorRange field. */
const DEFAULT_SENSOR_RANGE = 20;

// ─── Random events ────────────────────────────────────────────────────────────

const TRAVEL_EVENTS = [
  {
    type:  "anomaly_detection",
    label: "Sensors detect an anomalous reading off the port bow.",
  },
  {
    type:  "distress_signal",
    label: "Receiving fragmented distress signal on subspace frequencies.",
  },
  {
    type:  "unknown_vessel",
    label: "Unidentified vessel contact on long-range sensors.",
  },
  {
    type:  "spatial_hazard",
    label: "Navigation alert: spatial distortion detected along current heading.",
  },
];

/** 3% chance of an event per tick — roughly once every ~3 minutes at warp 7. */
const EVENT_CHANCE = 0.03;

function rollTravelEvent() {
  if (Math.random() > EVENT_CHANCE) return null;
  return TRAVEL_EVENTS[Math.floor(Math.random() * TRAVEL_EVENTS.length)];
}

// ─── Geometry ─────────────────────────────────────────────────────────────────

function dist3d(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Normalise a displacement vector. Returns a zero vector if length is 0.
 * @returns {{ nx: number, ny: number, nz: number }}
 */
function normalise(dx, dy, dz) {
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len === 0) return { nx: 0, ny: 0, nz: 0 };
  return { nx: dx / len, ny: dy / len, nz: dz / len };
}

// ─── Per-ship tick ────────────────────────────────────────────────────────────

/**
 * Advance one traveling ship by one movement tick.
 *
 * @param {import("firebase/firestore").Firestore} db
 * @param {import("firebase/firestore").DocumentReference} shipRef
 * @param {object} ship  Raw ship document data
 * @returns {Promise<object>}  Tick result for this ship
 */
async function tickShip(db, shipRef, ship) {
  const warp         = Math.min(9, Math.max(1, Math.round(ship.warpSpeed ?? 5)));
  const unitsPerMin  = WARP_UNITS_PER_MIN[warp] ?? 1.0;
  const stepDist     = unitsPerMin * TICK_MINUTES;

  const current = { x: ship.currentX ?? 0, y: ship.currentY ?? 0, z: ship.currentZ ?? 0 };
  const dest    = { x: ship.destinationX,   y: ship.destinationY,   z: ship.destinationZ };

  const remaining = dist3d(current, dest);

  let newPos;
  let arrived = false;

  if (remaining <= stepDist) {
    // Snap to destination — never overshoot
    newPos  = { x: dest.x, y: dest.y, z: dest.z };
    arrived = true;
  } else {
    const { nx, ny, nz } = normalise(
      dest.x - current.x,
      dest.y - current.y,
      dest.z - current.z,
    );
    newPos = {
      x: parseFloat((current.x + nx * stepDist).toFixed(4)),
      y: parseFloat((current.y + ny * stepDist).toFixed(4)),
      z: parseFloat((current.z + nz * stepDist).toFixed(4)),
    };
  }

  // Persist new position to Firestore
  await updateDoc(shipRef, {
    currentX:    newPos.x,
    currentY:    newPos.y,
    currentZ:    newPos.z,
    travelStatus: arrived ? "arrived" : "traveling",
    lastMovedAt: new Date().toISOString(),
  });

  // Run sensor sweep at new position (non-fatal)
  let sensorResult = { newlyDetected: [], chartingPercent: null };
  const shipId = ship.shipId ?? shipRef.id;

  if (ship.sectorId && ship.campaignId) {
    try {
      sensorResult = await runSensorSweep({
        sectorId:    ship.sectorId,
        campaignId:  ship.campaignId,
        shipId,
        shipX:       newPos.x,
        shipY:       newPos.y,
        shipZ:       newPos.z,
        sensorRange: ship.sensorRange ?? DEFAULT_SENSOR_RANGE,
      });
    } catch (err) {
      console.warn(`[warpEngine] Sensor sweep failed for ship ${shipId}:`, err.message);
    }
  }

  // Random events are suppressed on arrival tick
  const randomEvent = arrived ? null : rollTravelEvent();

  return {
    shipId,
    previousPos:     current,
    newPos,
    warpFactor:      warp,
    stepDistance:    parseFloat(stepDist.toFixed(4)),
    remainingDist:   arrived ? 0 : parseFloat((remaining - stepDist).toFixed(4)),
    arrived,
    newlyDetected:   sensorResult.newlyDetected,
    chartingPercent: sensorResult.chartingPercent,
    randomEvent,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Process one movement tick for ALL ships currently traveling.
 *
 * Call this from pages/api/navigation/tick.js on a 5-second interval
 * (client polling) or via a Vercel cron job (vercel.json schedule).
 *
 * @returns {Promise<{ processed: number, results: object[] }>}
 */
export async function updateShipMovement() {
  const db = getServerDb();

  const snap = await getDocs(
    query(
      collection(db, "ships"),
      where("travelStatus", "==", "traveling"),
    ),
  );

  if (snap.empty) {
    return { processed: 0, results: [] };
  }

  const results = await Promise.all(
    snap.docs.map((docSnap) =>
      tickShip(db, docSnap.ref, docSnap.data()).catch((err) => {
        console.error(`[warpEngine] tickShip error (${docSnap.id}):`, err.message);
        return { shipId: docSnap.id, error: err.message };
      }),
    ),
  );

  return { processed: snap.size, results };
}
