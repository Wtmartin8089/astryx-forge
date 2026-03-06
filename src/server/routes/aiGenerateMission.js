/**
 * aiGenerateMission.js
 * Express-compatible route handler for POST /api/ai/generateMission
 *
 * Expects body: { campaignId: string }
 * Returns: { missionTitle, briefing, objective, complication, possibleOutcome }
 */

import { buildMissionContext } from "../ai/buildMissionContext.js";
import { generateMissionEvent, OllamaUnavailableError } from "../ai/ollamaService.js";

export async function handleAIGenerateMission(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { campaignId } = req.body ?? {};

  if (!campaignId || typeof campaignId !== "string") {
    return res.status(400).json({ error: "campaignId is required." });
  }

  // Build context from Firestore
  let context;
  try {
    context = await buildMissionContext(campaignId);
  } catch (err) {
    console.error("[generateMission] Context build error:", err);
    return res.status(500).json({ error: "Failed to gather campaign context." });
  }

  // Generate mission via Ollama
  let mission;
  try {
    mission = await generateMissionEvent(context);
  } catch (err) {
    if (err instanceof OllamaUnavailableError) {
      return res.status(503).json({ error: "AI generator unavailable." });
    }
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: "AI returned unexpected format. Try again." });
    }
    console.error("[generateMission] AI error:", err.message);
    return res.status(502).json({ error: "AI service error. Please try again." });
  }

  return res.status(200).json({ ...mission, context });
}
