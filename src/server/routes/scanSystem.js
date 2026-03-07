/**
 * scanSystem.js
 * Express-compatible route handler for POST /api/scan/system
 *
 * Expects body:
 * {
 *   systemId:   string,
 *   campaignId: string,
 *   shipId:     string,
 * }
 *
 * Promotes an already-detected system (explorationLevel >= 1) to identified
 * (explorationLevel 2). Reveals star type and approximate planet count.
 * Planet list, asteroid belts, and anomalies remain hidden.
 */

import { identifySystem } from "../galaxy/systemScan.js";

export async function handleScanSystem(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { systemId, campaignId, shipId } = req.body ?? {};

  if (!systemId || typeof systemId !== "string") {
    return res.status(400).json({ error: "systemId is required." });
  }
  if (!campaignId || typeof campaignId !== "string") {
    return res.status(400).json({ error: "campaignId is required." });
  }
  if (!shipId || typeof shipId !== "string") {
    return res.status(400).json({ error: "shipId is required." });
  }

  try {
    const { system, upgraded } = await identifySystem(systemId, campaignId, shipId);

    const message = upgraded
      ? `System identified: ${system.provisionalName}. ${system.starType} — ${system.planetCount} planetary body count.`
      : "System already identified.";

    return res.status(200).json({ system, upgraded, message });
  } catch (err) {
    const status = err.status ?? 500;
    console.error("[scanSystem] Error:", err.message);
    return res.status(status).json({ error: err.message });
  }
}
