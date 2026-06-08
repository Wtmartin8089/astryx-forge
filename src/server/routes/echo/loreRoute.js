/**
 * loreRoute.js
 * Route handler for POST /api/echo/generateLore
 *
 * Body: { topic: string, type: string, forceRegenerate? }
 * Cache key: `${type}:${topic.toLowerCase().trim()}`
 * Returns: { ...lore, cached, id }
 */

import { generateLore, EchoUnavailableError } from "../../ai/echoService.js";
import { getCachedContent, setCachedContent } from "../../ai/echoCache.js";

export async function handleLore(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { topic, type, forceRegenerate = false } = req.body ?? {};

  if (!topic || typeof topic !== "string") {
    return res.status(400).json({ error: "topic is required." });
  }
  if (!type || typeof type !== "string") {
    return res.status(400).json({ error: "type is required." });
  }

  const key = `${type}:${topic.toLowerCase().trim()}`;

  if (!forceRegenerate) {
    try {
      const cached = await getCachedContent("lore", key);
      if (cached) {
        return res.status(200).json({ ...cached, cached: true, id: cached.id });
      }
    } catch (err) {
      console.error("[echo:lore] cache read error:", err.message);
    }
  }

  let lore;
  try {
    lore = await generateLore(topic, type);
  } catch (err) {
    if (err instanceof EchoUnavailableError) {
      return res.status(503).json({ error: "Echo AI unavailable." });
    }
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: "Echo returned unexpected format. Try again." });
    }
    console.error("[echo:lore] generation error:", err.message);
    return res.status(502).json({ error: "Echo service error. Please try again." });
  }

  let id = null;
  try {
    id = await setCachedContent("lore", key, lore, { topic, type });
  } catch (err) {
    console.error("[echo:lore] cache write error:", err.message);
  }

  return res.status(200).json({ ...lore, cached: false, id });
}
