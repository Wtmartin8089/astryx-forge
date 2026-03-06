/**
 * ollamaService.js
 * Sends generation requests to the local Ollama server.
 * Server URL is configurable via OLLAMA_HOST env var (default: http://ollama:11434).
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://ollama:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3";
const TIMEOUT_MS = 60_000; // Ollama can be slow on first generation

/**
 * Send a prompt to Ollama and return the generated text.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
export async function generateCampaignIdea(prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
      }),
    });
  } catch (err) {
    // Network failure or abort — surface as a distinct error type
    const isTimeout = err.name === "AbortError";
    throw new OllamaUnavailableError(
      isTimeout ? "Ollama request timed out." : "Ollama server is unreachable."
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Ollama returned ${response.status}: ${body}`);
  }

  const data = await response.json();

  if (!data.response) {
    throw new Error("Ollama returned an empty response.");
  }

  return data.response;
}

/**
 * Build a mission prompt from campaign context and send to Ollama.
 * Returns structured mission JSON.
 *
 * @param {{
 *   campaignName: string,
 *   worldType: string,
 *   unitName: string,
 *   unitType: string,
 *   scanResult: string,
 *   scanReport: string,
 *   recentForumPosts: string[],
 *   factions: string[]
 * }} context
 */
export async function generateMissionEvent(context) {
  const {
    campaignName,
    worldType,
    unitName,
    unitType,
    scanResult,
    scanReport,
    recentForumPosts,
    factions,
  } = context;

  const forumLine  = recentForumPosts.length
    ? `Recent crew discussions: ${recentForumPosts.slice(0, 3).join("; ")}.`
    : "";
  const factionLine = factions.length
    ? `Known factions in the region: ${factions.join(", ")}.`
    : "";

  const prompt = `You are the mission briefing computer for a tabletop RPG campaign.

Campaign: "${campaignName}" (world type: ${worldType})
Primary ${unitType}: ${unitName}
Most recently scanned system: ${scanResult}
Sensor report: ${scanReport}
${forumLine}
${factionLine}

Generate a mission event relevant to the situation above.
Return ONLY valid JSON with exactly these five fields — no markdown, no explanation, no extra text:

{
  "missionTitle": "A short punchy mission title (3-6 words)",
  "briefing": "2-3 sentences of mission briefing, referencing the scanned system and campaign context",
  "objective": "One clear sentence stating the primary mission objective",
  "complication": "One sentence describing an unexpected complication the crew will face",
  "possibleOutcome": "One sentence describing a possible dramatic outcome of the mission"
}`;

  const raw = await generateCampaignIdea(prompt);

  // Strip markdown fences and extract JSON object
  const clean = raw.replace(/^```json?\s*/im, "").replace(/```\s*$/im, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in mission event response.");

  const parsed = JSON.parse(match[0]);

  return {
    missionTitle:    String(parsed.missionTitle    ?? "").trim(),
    briefing:        String(parsed.briefing        ?? "").trim(),
    objective:       String(parsed.objective       ?? "").trim(),
    complication:    String(parsed.complication    ?? "").trim(),
    possibleOutcome: String(parsed.possibleOutcome ?? "").trim(),
  };
}

/** Thrown when Ollama is unreachable so callers can show a specific message. */
export class OllamaUnavailableError extends Error {
  constructor(message = "AI generator unavailable.") {
    super(message);
    this.name = "OllamaUnavailableError";
  }
}
