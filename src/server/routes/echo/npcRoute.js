/**
 * npcRoute.js
 * Route handler for POST /api/echo/generateNpc
 *
 * Body: { context?: { faction, shipName, setting, tone }, cacheKey?, forceRegenerate? }
 * Returns: { ...npc, cached, id }
 */

import { generateNPC, EchoUnavailableError } from "../../ai/echoService.js";
import { getCachedContent, setCachedContent } from "../../ai/echoCache.js";

export async function handleNpc(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { context = {}, cacheKey, forceRegenerate = false } = req.body ?? {};
  const key = cacheKey ?? `npc:${JSON.stringify(context)}`;

  // Cache lookup
  if (!forceRegenerate) {
    try {
      const cached = await getCachedContent("npc", key);
      if (cached) {
        return res.status(200).json({ ...cached, cached: true, id: cached.id });
      }
    } catch (err) {
      console.error("[echo:npc] cache read error:", err.message);
    }
  }

  // Generate
  let npc;
  try {
    npc = await generateNPC(context);
  } catch (err) {
    if (err instanceof EchoUnavailableError) {
      return res.status(503).json({ error: "Echo AI unavailable." });
    }
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: "Echo returned unexpected format. Try again." });
    }
    console.error("[echo:npc] generation error:", err.message);
    return res.status(502).json({ error: "Echo service error. Please try again." });
  }

  // Persist to cache
  let id = null;
  try {
    id = await setCachedContent("npc", key, npc, { context });
  } catch (err) {
    console.error("[echo:npc] cache write error:", err.message);
  }

  return res.status(200).json({ ...npc, cached: false, id });
}
