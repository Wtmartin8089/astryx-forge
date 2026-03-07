/**
 * scanSector.js
 * Express-compatible route handler for POST /api/scan/sector
 *
 * Expects body:
 * {
 *   shipId:      string,
 *   sectorId:    string,
 *   campaignId:  string,
 *   shipX:       number,
 *   shipY:       number,
 *   shipZ:       number,
 *   sensorRange: number,
 * }
 *
 * Runs a sensor sweep from the ship's current position.
 * Any hidden system within sensorRange is promoted to explorationLevel 1
 * and returned as "Unknown stellar signature". Sector charting is updated.
 */

import { runSensorSweep } from "../galaxy/sensorDetection.js";

export async function handleScanSector(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { shipId, sectorId, campaignId, shipX, shipY, shipZ, sensorRange } =
    req.body ?? {};

  if (!shipId || typeof shipId !== "string") {
    return res.status(400).json({ error: "shipId is required." });
  }
  if (!sectorId || typeof sectorId !== "string") {
    return res.status(400).json({ error: "sectorId is required." });
  }
  if (!campaignId || typeof campaignId !== "string") {
    return res.status(400).json({ error: "campaignId is required." });
  }
  if (typeof shipX !== "number" || typeof shipY !== "number" || typeof shipZ !== "number") {
    return res.status(400).json({ error: "shipX, shipY, shipZ must be numbers." });
  }
  if (typeof sensorRange !== "number" || sensorRange <= 0) {
    return res.status(400).json({ error: "sensorRange must be a positive number." });
  }

  try {
    const { newlyDetected, chartingPercent } = await runSensorSweep({
      sectorId,
      campaignId,
      shipId,
      shipX,
      shipY,
      shipZ,
      sensorRange,
    });

    const message =
      newlyDetected.length > 0
        ? `Sensors detected ${newlyDetected.length} new stellar signature(s).`
        : "Sensor sweep complete. No new contacts.";

    return res.status(200).json({ newlyDetected, chartingPercent, message });
  } catch (err) {
    console.error("[scanSector] Error:", err);
    return res.status(500).json({ error: "Sensor sweep failed." });
  }
}
