/**
 * imageRoute.js
 * Route handler for POST /api/echo/generateImage
 *
 * Body: { imageType: string, subject: string, options?: object, forceRegenerate? }
 * Cache key: `${imageType}:${subject.slice(0,80)}`
 * Returns: { url, data, prompt, cached, id }
 */

import { generateImage, EchoUnavailableError } from "../../ai/echoService.js";
import { getCachedContent, setCachedContent } from "../../ai/echoCache.js";

export async function handleImage(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageType, subject, options = {}, forceRegenerate = false } = req.body ?? {};

  if (!imageType || typeof imageType !== "string") {
    return res.status(400).json({ error: "imageType is required." });
  }
  if (!subject || typeof subject !== "string") {
    return res.status(400).json({ error: "subject is required." });
  }

  const key = `${imageType}:${subject.slice(0, 80)}`;

  if (!forceRegenerate) {
    try {
      const cached = await getCachedContent("image", key);
      if (cached) {
        return res.status(200).json({ ...cached, cached: true, id: cached.id });
      }
    } catch (err) {
      console.error("[echo:image] cache read error:", err.message);
    }
  }

  let image;
  try {
    image = await generateImage(imageType, subject, options);
  } catch (err) {
    if (err instanceof EchoUnavailableError) {
      return res.status(503).json({ error: "Echo AI unavailable." });
    }
    console.error("[echo:image] generation error:", err.message);
    return res.status(502).json({ error: "Echo image service error. Please try again." });
  }

  let id = null;
  try {
    id = await setCachedContent("image", key, image, { imageType, subject });
  } catch (err) {
    console.error("[echo:image] cache write error:", err.message);
  }

  return res.status(200).json({ ...image, cached: false, id });
}
