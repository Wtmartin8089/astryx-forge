/**
 * Vercel serverless function — AI Campaign Idea Generator
 * Uses Anthropic Claude API via fetch (no SDK dependency required).
 * Set ANTHROPIC_API_KEY in Vercel environment variables.
 */

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { worldType = "science fiction starship exploration" } = req.body ?? {};

  const worldPrompts = {
    "fleet-command":      "a science fiction Starfleet starship exploration game in the style of Star Trek",
    "dark-nights":        "an urban gothic game of vampire politics, ancient bloodlines, and nocturnal intrigue",
    "galactic-conflict":  "a space opera game of faction warfare, interstellar politics, and military campaigns",
    "fantasy-realms":     "a classic high fantasy adventure with dungeons, kingdoms, and ancient magic",
  };

  const worldDesc = worldPrompts[worldType] ?? worldPrompts["fleet-command"];

  const prompt = `Generate a tabletop RPG campaign idea for ${worldDesc}.

Return ONLY valid JSON with exactly these four fields — no markdown, no explanation, no extra text:

{
  "campaignName": "A short evocative title (3-6 words)",
  "synopsis": "A compelling 2-3 sentence overview of the campaign setting and central conflict",
  "startingMission": "A 1-2 sentence description of the opening mission that hooks the players",
  "primaryThreat": "A 1-2 sentence description of the main antagonist force or threat"
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return res.status(502).json({ error: "AI service unavailable. Check ANTHROPIC_API_KEY." });
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text ?? "";

    // Strip any accidental markdown fences before parsing
    const clean = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      console.error("JSON parse failed. Raw output:", raw);
      return res.status(500).json({ error: "AI returned unexpected format. Try again." });
    }

    return res.status(200).json({
      campaignName:   parsed.campaignName   ?? "",
      synopsis:       parsed.synopsis       ?? "",
      startingMission: parsed.startingMission ?? "",
      primaryThreat:  parsed.primaryThreat  ?? "",
    });
  } catch (err) {
    console.error("generateCampaign error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}
