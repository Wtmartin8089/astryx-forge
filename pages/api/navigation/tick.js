/**
 * POST /api/navigation/tick
 *
 * Movement engine tick — advances all traveling ships by one 5-second step.
 *
 * Call this from the client every 5 seconds while any ship is traveling,
 * or configure it as a Vercel cron job in vercel.json:
 *
 *   {
 *     "crons": [{ "path": "/api/navigation/tick", "schedule": "* * * * *" }]
 *   }
 *
 * Note: Vercel cron minimum resolution is 1 minute. For true 5-second ticks,
 * use client-side polling while ships are in transit and fall back to cron
 * for background catch-up.
 *
 * Returns:
 * {
 *   processed: number,          — ships advanced this tick
 *   results: [                  — per-ship results
 *     {
 *       shipId,
 *       previousPos,
 *       newPos,
 *       warpFactor,
 *       stepDistance,
 *       remainingDist,
 *       arrived,
 *       newlyDetected,          — systems detected this tick
 *       chartingPercent,
 *       randomEvent,            — null or { type, label }
 *     }
 *   ]
 * }
 */

import { updateShipMovement } from "../../../src/server/navigation/warpEngine.js";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const result = await updateShipMovement();
    return res.status(200).json(result);
  } catch (err) {
    console.error("[tick] updateShipMovement error:", err);
    return res.status(500).json({ error: "Movement tick failed." });
  }
}
