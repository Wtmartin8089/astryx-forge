/**
 * surveySystem.js
 * Express-compatible route handler for POST /api/survey/system
 *
 * Expects body:
 * {
 *   systemId:   string,
 *   campaignId: string,
 *   shipId:     string,
 * }
 *
 * Called when a ship physically enters a system.
 * Sets explorationLevel = 3. Reveals planet class list, asteroid belt count,
 * and anomaly presence. Planet details (gravity, life signs, etc.) remain
 * hidden until individual planet scans.
 */

import { surveySystem } from "../galaxy/systemSurvey.js";

export async function handleSurveySystem(req, res) {
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
    const { system, planets, anomaly, upgraded } = await surveySystem(
      systemId,
      campaignId,
      shipId,
    );

    const anomalyNote = anomaly ? " Anomalous reading present." : "";
    const message = upgraded
      ? `System surveyed. ${planets.length} planetary bodies charted.${anomalyNote}`
      : `System survey on record. ${planets.length} planetary bodies charted.${anomalyNote}`;

    return res.status(200).json({ system, planets, anomaly, upgraded, message });
  } catch (err) {
    const status = err.status ?? 500;
    console.error("[surveySystem] Error:", err.message);
    return res.status(status).json({ error: err.message });
  }
}
