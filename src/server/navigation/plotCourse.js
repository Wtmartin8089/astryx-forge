/**
 * plotCourse.js
 * Express-compatible route handler for POST /api/navigation/plot-course
 *
 * Expects body:
 * {
 *   shipId:      string,
 *   campaignId:  string,
 *   destination: { x: number, y: number, z: number },
 *   warpSpeed:   number  (1–9)
 * }
 *
 * Sets the ship's destination, warp speed, and travel_status = "traveling".
 * Rejects if the ship is already traveling (guard against mid-flight re-course).
 * Returns estimated travel time based on warp factor.
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  limit,
} from "firebase/firestore";
import { getServerDb } from "../firebase/serverDb.js";
import { distance3d } from "../galaxy/sensorDetection.js";

// ─── Constants ────────────────────────────────────────────────────────────────

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

const MIN_WARP = 1;
const MAX_WARP = 9;

// ─── Ship resolution ──────────────────────────────────────────────────────────

/**
 * Resolve a ship's Firestore DocumentReference and data by shipId.
 * Tries direct document-ID lookup first; falls back to a field query.
 * Returns null if not found.
 *
 * @param {import("firebase/firestore").Firestore} db
 * @param {string} shipId
 * @returns {Promise<{ ref: DocumentReference, data: object }|null>}
 */
async function resolveShip(db, shipId) {
  const directRef  = doc(db, "ships", shipId);
  const directSnap = await getDoc(directRef);
  if (directSnap.exists()) {
    return { ref: directRef, data: directSnap.data() };
  }

  const snap = await getDocs(
    query(collection(db, "ships"), where("shipId", "==", shipId), limit(1)),
  );
  if (snap.empty) return null;
  return { ref: snap.docs[0].ref, data: snap.docs[0].data() };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function handlePlotCourse(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { shipId, campaignId, destination, warpSpeed } = req.body ?? {};

  if (!shipId || typeof shipId !== "string") {
    return res.status(400).json({ error: "shipId is required." });
  }
  if (!campaignId || typeof campaignId !== "string") {
    return res.status(400).json({ error: "campaignId is required." });
  }
  if (
    !destination ||
    typeof destination.x !== "number" ||
    typeof destination.y !== "number" ||
    typeof destination.z !== "number"
  ) {
    return res.status(400).json({ error: "destination must have numeric x, y, z." });
  }
  if (
    typeof warpSpeed !== "number" ||
    warpSpeed < MIN_WARP ||
    warpSpeed > MAX_WARP
  ) {
    return res
      .status(400)
      .json({ error: `warpSpeed must be a number between ${MIN_WARP} and ${MAX_WARP}.` });
  }

  const db = getServerDb();

  let resolved;
  try {
    resolved = await resolveShip(db, shipId);
  } catch (err) {
    console.error("[plotCourse] Ship lookup error:", err);
    return res.status(500).json({ error: "Failed to resolve ship." });
  }

  if (!resolved) {
    return res.status(404).json({ error: "Ship not found." });
  }

  const { ref: shipRef, data: ship } = resolved;

  // Prevent re-plotting while already underway
  if (ship.travelStatus === "traveling") {
    return res.status(409).json({
      error: "Ship is already traveling. Drop out of warp before plotting a new course.",
    });
  }

  const currentPos = {
    x: ship.currentX ?? 0,
    y: ship.currentY ?? 0,
    z: ship.currentZ ?? 0,
  };

  const distance = distance3d(currentPos, destination);

  if (distance === 0) {
    return res.status(400).json({ error: "Ship is already at the specified destination." });
  }

  const warpFactor    = Math.round(warpSpeed);
  const unitsPerMin   = WARP_UNITS_PER_MIN[warpFactor] ?? 1.0;
  const estMinutes    = parseFloat((distance / unitsPerMin).toFixed(1));
  const estTickCount  = Math.ceil((estMinutes * 60) / 5); // 5-second ticks

  try {
    await updateDoc(shipRef, {
      destinationX: destination.x,
      destinationY: destination.y,
      destinationZ: destination.z,
      warpSpeed:    warpFactor,
      travelStatus: "traveling",
      courseSetAt:  new Date().toISOString(),
    });
  } catch (err) {
    console.error("[plotCourse] updateDoc error:", err);
    return res.status(500).json({ error: "Failed to set course." });
  }

  return res.status(200).json({
    message:         `Course laid in. Engaging warp ${warpFactor}.`,
    shipId,
    currentPos,
    destination,
    distance:        parseFloat(distance.toFixed(2)),
    warpSpeed:       warpFactor,
    estimatedMinutes: estMinutes,
    estimatedTicks:  estTickCount,
    travelStatus:    "traveling",
  });
}
