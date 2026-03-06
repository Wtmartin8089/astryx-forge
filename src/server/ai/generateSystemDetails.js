/**
 * generateSystemDetails.js
 * Uses the Ollama AI service to generate details for a newly discovered star system.
 */

import { generateCampaignIdea, OllamaUnavailableError } from "./ollamaService.js";

/**
 * Generate rich details for a star system.
 *
 * @param {string} campaignTheme  e.g. "exploration", "combat"
 * @returns {Promise<{systemName: string, starType: string, planetCount: number, anomaly: string, missionHook: string}>}
 */
export async function generateSystemDetails(campaignTheme = "exploration") {
  const prompt = `Generate a discovered star system for a sci-fi tabletop RPG ${campaignTheme} campaign.

Return ONLY valid JSON with exactly these five fields — no markdown, no explanation, no extra text:

{
  "systemName": "A memorable 2-4 word system name (e.g. 'Kepler's Reach', 'The Dying Sun', 'Nova Kessari')",
  "starType": "One of: Red Dwarf, Yellow Star, Blue Giant, Neutron Star, Binary System, White Dwarf, Pulsar",
  "planetCount": a number from 0 to 9,
  "anomaly": "A single evocative sentence describing a spatial or scientific anomaly in this system",
  "missionHook": "A single sentence suggesting a mission or story hook players could pursue here"
}`;

  const raw = await generateCampaignIdea(prompt);

  // Strip markdown fences and find JSON
  const clean = raw.replace(/^```json?\s*/im, "").replace(/```\s*$/im, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in system details response.");

  const parsed = JSON.parse(match[0]);

  return {
    systemName:   String(parsed.systemName  ?? "Unknown System").trim(),
    starType:     String(parsed.starType    ?? "Unknown").trim(),
    planetCount:  Number.isFinite(Number(parsed.planetCount)) ? Number(parsed.planetCount) : 0,
    anomaly:      String(parsed.anomaly     ?? "").trim(),
    missionHook:  String(parsed.missionHook ?? "").trim(),
  };
}

export { OllamaUnavailableError };
