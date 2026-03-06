/**
 * aiGenerateCampaign.js
 * Express-compatible route handler for POST /api/ai/generateCampaign
 *
 * Expects body: { theme?: string, tone?: string }
 * Returns:      { campaignName, synopsis, startingMission, primaryThreat }
 */

import { generateCampaignIdea, OllamaUnavailableError } from "../ai/ollamaService.js";

const THEME_DEFAULTS = {
  exploration:    "science fiction starship exploration",
  combat:         "military starship tactical engagement",
  diplomatic:     "interstellar political negotiation and diplomacy",
  horror:         "cosmic horror and survival in deep space",
  mystery:        "investigative espionage aboard a space station",
};

function buildPrompt(theme, tone) {
  const themeDesc = THEME_DEFAULTS[theme] ?? `${theme} tabletop RPG`;
  const toneDesc  = tone ? ` The tone should be ${tone}.` : "";

  return `Generate a tabletop RPG campaign idea for a ${themeDesc} game.${toneDesc}

Return ONLY valid JSON with exactly these four fields — no markdown, no explanation, no extra text:

{
  "campaignName": "A short evocative title (3–6 words)",
  "synopsis": "A compelling 2–3 sentence overview of the campaign setting and central conflict",
  "startingMission": "A 1–2 sentence description of the opening mission that hooks the players",
  "primaryThreat": "A 1–2 sentence description of the main antagonist force or threat"
}`;
}

function parseGeneratedJSON(raw) {
  // Strip accidental markdown code fences before parsing
  const clean = raw
    .replace(/^```json?\s*/im, "")
    .replace(/```\s*$/im, "")
    .trim();

  // Find the first { ... } block in case the model added surrounding text
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in AI response.");

  const parsed = JSON.parse(match[0]);

  return {
    campaignName:    String(parsed.campaignName    ?? "").trim(),
    synopsis:        String(parsed.synopsis        ?? "").trim(),
    startingMission: String(parsed.startingMission ?? "").trim(),
    primaryThreat:   String(parsed.primaryThreat   ?? "").trim(),
  };
}

/**
 * Route handler — compatible with both Express and Vercel serverless.
 */
export async function handleAIGenerateCampaign(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { theme = "exploration", tone = "serious" } = req.body ?? {};

  if (typeof theme !== "string" || theme.trim().length === 0) {
    return res.status(400).json({ error: "Invalid theme parameter." });
  }

  const prompt = buildPrompt(theme.trim().toLowerCase(), tone?.trim());

  let raw;
  try {
    raw = await generateCampaignIdea(prompt);
  } catch (err) {
    if (err instanceof OllamaUnavailableError) {
      return res.status(503).json({ error: "AI generator unavailable." });
    }
    console.error("[aiGenerateCampaign] Ollama error:", err.message);
    return res.status(502).json({ error: "AI service error. Please try again." });
  }

  let result;
  try {
    result = parseGeneratedJSON(raw);
  } catch (err) {
    console.error("[aiGenerateCampaign] JSON parse error. Raw output:", raw);
    return res.status(500).json({ error: "AI returned an unexpected format. Try again." });
  }

  return res.status(200).json(result);
}
