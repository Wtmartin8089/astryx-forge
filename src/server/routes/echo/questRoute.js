/**
 * questRoute.js
 * Route handler for POST /api/echo/generateQuest
 *
 * Body: { context?: { shipName, region, difficulty, factionHint }, cacheKey?, forceRegenerate? }
 * Returns: { ...quest, cached, id }
 */

import { generateQuest, EchoUnavailableError } from "../../ai/echoService.js";
import { getCachedContent, setCachedContent } from "../../ai/echoCache.js";

export async function handleQuest(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { context = {}, cacheKey, forceRegenerate = false } = req.body ?? {};
  const key = cacheKey ?? `quest:${JSON.stringify(context)}`;

  if (!forceRegenerate) {
    try {
      const cached = await getCachedContent("quest", key);
      if (cached) {
        return res.status(200).json({ ...cached, cached: true, id: cached.id });
      }
    } catch (err) {
      console.error("[echo:quest] cache read error:", err.message);
    }
  }

  let quest;
  try {
    quest = await generateQuest(context);
  } catch (err) {
    if (err instanceof EchoUnavailableError) {
      return res.status(503).json({ error: "Echo AI unavailable." });
    }
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: "Echo returned unexpected format. Try again." });
    }
    console.error("[echo:quest] generation error:", err.message);
    return res.status(502).json({ error: "Echo service error. Please try again." });
  }

  let id = null;
  try {
    id = await setCachedContent("quest", key, quest, { context });
  } catch (err) {
    console.error("[echo:quest] cache write error:", err.message);
  }

  return res.status(200).json({ ...quest, cached: false, id });
}
