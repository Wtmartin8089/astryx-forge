/**
 * scanAnomaly.js
 * Express-compatible route handler for POST /api/anomaly/scan
 *
 * Expects body: { anomalyId: string, campaignId: string, shipId: string }
 *
 * Advances the anomaly's investigation level by one step.
 * Returns the updated anomaly with level-appropriate revealed data.
 */

import { scanAnomaly } from "../anomalies/scanAnomaly.js";

export async function handleScanAnomaly(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { anomalyId, campaignId, shipId } = req.body ?? {};

  if (!anomalyId  || typeof anomalyId  !== "string") return res.status(400).json({ error: "anomalyId is required."  });
  if (!campaignId || typeof campaignId !== "string") return res.status(400).json({ error: "campaignId is required." });
  if (!shipId     || typeof shipId     !== "string") return res.status(400).json({ error: "shipId is required."     });

  try {
    const result = await scanAnomaly(anomalyId, campaignId, shipId);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status ?? 500;
    console.error("[scanAnomaly] Error:", err.message);
    return res.status(status).json({ error: err.message });
  }
}
