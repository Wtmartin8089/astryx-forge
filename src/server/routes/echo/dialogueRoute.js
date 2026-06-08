/**
 * dialogueRoute.js
 * Route handler for POST /api/echo/generateDialogue
 *
 * Body: { npc: object, situation: string, campaignContext?: object }
 * NOT cached — dialogue is always generated fresh.
 * Returns: { opening, options: [{ playerLine, npcResponse }], conclusion }
 */

import { generateDialogue, EchoUnavailableError } from "../../ai/echoService.js";

export async function handleDialogue(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { npc, situation, campaignContext = {} } = req.body ?? {};

  if (!npc || typeof npc !== "object") {
    return res.status(400).json({ error: "npc object is required." });
  }
  if (!situation || typeof situation !== "string") {
    return res.status(400).json({ error: "situation is required." });
  }

  let dialogue;
  try {
    dialogue = await generateDialogue(npc, situation, campaignContext);
  } catch (err) {
    if (err instanceof EchoUnavailableError) {
      return res.status(503).json({ error: "Echo AI unavailable." });
    }
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: "Echo returned unexpected format. Try again." });
    }
    console.error("[echo:dialogue] generation error:", err.message);
    return res.status(502).json({ error: "Echo service error. Please try again." });
  }

  return res.status(200).json(dialogue);
}
