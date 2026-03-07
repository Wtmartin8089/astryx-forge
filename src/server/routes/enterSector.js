/**
 * enterSector.js
 * Express-compatible route handler for POST /api/galaxy/enter-sector
 *
 * Expects body: { shipId: string, sectorDesignation: string, campaignId: string }
 *
 * Behavior:
 *   1. Validates inputs.
 *   2. Loads or generates the sector (deterministic, persistent).
 *   3. Marks sector discovered by this ship on first entry.
 *   4. Updates ship's current sector in Firestore (non-fatal if ship doc absent).
 *   5. Returns sector charting metadata + only systems visible to the ship.
 *      Hidden systems (masked === true) are NEVER sent to the client.
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { getServerDb } from "../firebase/serverDb.js";
import { loadOrGenerateSector } from "../galaxy/loadOrGenerateSector.js";

/**
 * Returns how many systems in a sector are visible (explorationLevel > 0).
 * Filters in memory to avoid requiring a Firestore composite index.
 *
 * @param {import("firebase/firestore").Firestore} db
 * @param {string} sectorId
 * @param {string} campaignId
 * @returns {Promise<{ visible: object[], total: number }>}
 */
async function querySectorSystems(db, sectorId, campaignId) {
  const snap = await getDocs(
    query(
      collection(db, "systems"),
      where("sectorId", "==", sectorId),
      where("campaignId", "==", campaignId),
    ),
  );

  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const visible = all.filter((s) => s.masked === false || s.explorationLevel > 0);

  return { visible, total: all.length };
}

/**
 * Attempts to update the ship's current sector position.
 * Silently skips if the ship document does not exist in Firestore.
 *
 * @param {import("firebase/firestore").Firestore} db
 * @param {string} shipId
 * @param {string} campaignId
 * @param {string} sectorDesignation
 * @param {string} sectorId
 */
async function updateShipPosition(db, shipId, campaignId, sectorDesignation, sectorId) {
  // Ships may be stored by shipId as the document ID, or as a field.
  // Try direct doc lookup first, then fall back to a field query.
  const directRef = doc(db, "ships", shipId);
  const directSnap = await getDoc(directRef);

  if (directSnap.exists()) {
    await updateDoc(directRef, {
      currentSectorDesignation: sectorDesignation,
      currentSectorId: sectorId,
      lastSectorEntryAt: serverTimestamp(),
    });
    return;
  }

  // Field-based fallback
  const snap = await getDocs(
    query(
      collection(db, "ships"),
      where("shipId", "==", shipId),
      where("campaignId", "==", campaignId),
      limit(1),
    ),
  );

  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, {
      currentSectorDesignation: sectorDesignation,
      currentSectorId: sectorId,
      lastSectorEntryAt: serverTimestamp(),
    });
  }
  // If ship not in Firestore, skip silently — ships may be localStorage-only.
}

/**
 * Compute charting progress percentage from visible system count.
 *
 * @param {number} visibleCount
 * @param {number} totalCount
 * @returns {number}  0–100, rounded to one decimal
 */
function computeChartingPercent(visibleCount, totalCount) {
  if (!totalCount) return 0;
  return parseFloat(((visibleCount / totalCount) * 100).toFixed(1));
}

export async function handleEnterSector(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { shipId, sectorDesignation, campaignId } = req.body ?? {};

  if (!shipId || typeof shipId !== "string") {
    return res.status(400).json({ error: "shipId is required." });
  }
  if (!sectorDesignation || typeof sectorDesignation !== "string") {
    return res.status(400).json({ error: "sectorDesignation is required." });
  }
  if (!campaignId || typeof campaignId !== "string") {
    return res.status(400).json({ error: "campaignId is required." });
  }

  const db = getServerDb();

  // ── Load or generate sector (deterministic, writes to Firestore once) ──
  let sector;
  try {
    sector = await loadOrGenerateSector(campaignId, sectorDesignation);
  } catch (err) {
    console.error("[enterSector] loadOrGenerateSector error:", err);
    return res.status(500).json({ error: "Failed to load or generate sector." });
  }

  // ── Mark sector as discovered by this ship on first entry ──
  if (!sector.discoveredByShip) {
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "sectors", sector.id), {
        discoveredByShip: shipId,
        discoveredStardate: now,
        status: "active",
        chartingPercent: 0,
      });
      sector.discoveredByShip = shipId;
      sector.discoveredStardate = now;
      sector.chartingPercent = 0;
      sector.status = "active";
    } catch (err) {
      console.error("[enterSector] Sector discovery update error:", err);
      // Non-fatal — sector still usable
    }
  }

  // ── Update ship's current sector position (non-fatal) ──
  try {
    await updateShipPosition(db, shipId, campaignId, sectorDesignation, sector.id);
  } catch (err) {
    console.warn("[enterSector] Ship position update skipped:", err.message);
  }

  // ── Query systems — return only those visible to players ──
  let visible = [];
  let totalSystemCount = sector.systemCount ?? 0;

  try {
    const result = await querySectorSystems(db, sector.id, campaignId);
    visible = result.visible;
    totalSystemCount = result.total || totalSystemCount;
  } catch (err) {
    console.error("[enterSector] Systems query error:", err);
    return res.status(500).json({ error: "Failed to query sector systems." });
  }

  const chartingPercent = computeChartingPercent(visible.length, totalSystemCount);

  // Strip hidden planet/anomaly details from visible systems before sending
  const sanitizedSystems = visible.map(({ id, provisionalName, displayName, starType,
    explorationLevel, xCoord, yCoord, zCoord, discoveredByShip, discoveredStardate }) => ({
    id,
    provisionalName,
    displayName,
    starType,
    explorationLevel,
    xCoord,
    yCoord,
    zCoord,
    discoveredByShip,
    discoveredStardate,
  }));

  const message = sanitizedSystems.length === 0
    ? "Sector entered. No systems on sensors. Initiate scan sweep to begin charting."
    : `Sector entered. ${sanitizedSystems.length} of ${totalSystemCount} system(s) on record.`;

  return res.status(200).json({
    sector: {
      id:                  sector.id,
      designation:         sector.designation,
      trait:               sector.trait,
      status:              sector.status ?? "active",
      chartingPercent,
      totalSystemCount,
      xOrigin:             sector.xOrigin,
      yOrigin:             sector.yOrigin,
      zOrigin:             sector.zOrigin,
      discoveredByShip:    sector.discoveredByShip ?? null,
      discoveredStardate:  sector.discoveredStardate ?? null,
    },
    visibleSystems: sanitizedSystems,
    chartingPercent,
    message,
  });
}
