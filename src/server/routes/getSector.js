/**
 * getSector.js
 * Express-compatible route handler for GET /api/sector/:id
 *
 * Returns a client-safe snapshot of sector state:
 *   - sector metadata (designation, trait, charting percent)
 *   - visibleSystems  (explorationLevel >= 2)
 *   - unknownSignals  (explorationLevel == 1)
 *   - anomalies       (parent system explorationLevel >= 3)
 *   - ships           currently in this sector
 *
 * Hidden systems (explorationLevel 0) are NEVER included in the response.
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { getServerDb } from "../firebase/serverDb.js";

export async function handleGetSector(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sectorId = req.query?.id ?? req.params?.id;

  if (!sectorId || typeof sectorId !== "string") {
    return res.status(400).json({ error: "sectorId is required." });
  }

  const db = getServerDb();

  // ── Fetch sector ──────────────────────────────────────────────────────────
  let sectorSnap;
  try {
    sectorSnap = await getDoc(doc(db, "sectors", sectorId));
  } catch (err) {
    console.error("[getSector] getDoc error:", err);
    return res.status(500).json({ error: "Database error." });
  }

  if (!sectorSnap.exists()) {
    return res.status(404).json({ error: "Sector not found." });
  }

  const sector     = sectorSnap.data();
  const campaignId = sector.campaignId;

  // ── Fetch all systems in sector ───────────────────────────────────────────
  let systemsSnap;
  try {
    systemsSnap = await getDocs(
      query(
        collection(db, "systems"),
        where("sectorId",   "==", sectorId),
        where("campaignId", "==", campaignId),
      ),
    );
  } catch (err) {
    console.error("[getSector] systems query error:", err);
    return res.status(500).json({ error: "Failed to query systems." });
  }

  // Filter — never expose hidden systems to the client
  const revealed = systemsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => (s.explorationLevel ?? 0) > 0);

  // Unknown signals (level 1)
  const unknownSignals = revealed
    .filter((s) => s.explorationLevel === 1)
    .map(({ id, explorationLevel, xCoord, yCoord, discoveredByShip }) => ({
      id,
      explorationLevel,
      xCoord,
      yCoord,
      discoveredByShip: discoveredByShip ?? null,
    }));

  // Visible identified / surveyed systems (level >= 2)
  const visibleSystems = revealed
    .filter((s) => (s.explorationLevel ?? 0) >= 2)
    .map(({
      id, explorationLevel, provisionalName, displayName,
      starType, planetCount, asteroidBelts, anomalyPresent,
      xCoord, yCoord, discoveredByShip,
    }) => ({
      id,
      explorationLevel,
      provisionalName,
      displayName:      displayName ?? null,
      starType,
      planetCount,
      asteroidBelts:    asteroidBelts ?? 0,
      anomalyPresent:   anomalyPresent ?? false,
      xCoord,
      yCoord,
      discoveredByShip: discoveredByShip ?? null,
    }));

  // ── Fetch anomalies (only for surveyed systems, level >= 3) ──────────────
  const surveyedIds = revealed
    .filter((s) => s.anomalyPresent && (s.explorationLevel ?? 0) >= 3)
    .map((s) => s.id);

  let anomalies = [];
  if (surveyedIds.length > 0) {
    try {
      const anomalySnap = await getDocs(
        query(
          collection(db, "anomalies"),
          where("sectorId",   "==", sectorId),
          where("campaignId", "==", campaignId),
        ),
      );
      anomalies = anomalySnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((a) => surveyedIds.includes(a.systemId))
        .map(({ id, systemId, scale, type, status, investigationLevel }) => ({
          id,
          systemId,
          scale,
          // Mask anomaly type until investigated
          type:   (investigationLevel ?? 0) > 0 ? type : "Anomalous reading detected",
          status,
        }));
    } catch (err) {
      // Non-fatal — return empty anomalies list
      console.warn("[getSector] Anomaly query failed:", err.message);
    }
  }

  // ── Fetch ships in sector ─────────────────────────────────────────────────
  let ships = [];
  try {
    const shipsSnap = await getDocs(
      query(
        collection(db, "ships"),
        where("sectorId",   "==", sectorId),
        where("campaignId", "==", campaignId),
      ),
    );
    ships = shipsSnap.docs.map((d) => {
      const ship = d.data();
      return {
        id:           d.id,
        name:         ship.name ?? "Unknown Vessel",
        currentX:     ship.currentX     ?? 0,
        currentY:     ship.currentY     ?? 0,
        sensorRange:  ship.sensorRange  ?? 20,
        travelStatus: ship.travelStatus ?? "idle",
      };
    });
  } catch (err) {
    console.warn("[getSector] Ships query failed:", err.message);
  }

  return res.status(200).json({
    sector: {
      id:               sectorId,
      designation:      sector.designation,
      trait:            sector.trait,
      chartingPercent:  sector.chartingPercent ?? 0,
      totalSystemCount: sector.systemCount     ?? 0,
      status:           sector.status          ?? "active",
    },
    visibleSystems,
    unknownSignals,
    anomalies,
    ships,
  });
}
