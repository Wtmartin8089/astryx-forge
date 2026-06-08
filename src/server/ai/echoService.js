/**
 * echoService.js
 * Domain content generators for the Astryx Forge Star Trek RPG.
 * Builds focused prompts, calls Echo, strips markdown fences, parses JSON,
 * and returns typed objects.
 */

import { echoGenerate, echoGenerateImage, EchoUnavailableError } from "./echoClient.js";

const SETTING = "the Star Trek universe";

/**
 * Strip markdown fences and extract the first JSON object from raw model output.
 * @param {string} raw
 * @returns {object}
 */
function parseJsonResponse(raw, label) {
  const clean = raw
    .replace(/^```json?\s*/im, "")
    .replace(/```\s*$/im, "")
    .trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new SyntaxError(`No JSON found in ${label} response.`);
  }
  return JSON.parse(match[0]);
}

/** Coerce a value to a trimmed string. */
const str = (v) => String(v ?? "").trim();

/** Coerce a value to a string array. */
function arr(v) {
  if (Array.isArray(v)) return v.map((x) => str(x)).filter(Boolean);
  if (v == null || v === "") return [];
  return [str(v)];
}

// ─── NPC ──────────────────────────────────────────────────────────────────────

/**
 * @param {{ faction?: string, shipName?: string, setting?: string, tone?: string }} context
 */
export async function generateNPC(context = {}) {
  const { faction, shipName, setting, tone } = context;

  const details = [
    faction ? `They are affiliated with the faction: ${faction}.` : "",
    shipName ? `They may be connected to the vessel: ${shipName}.` : "",
    setting ? `Setting detail: ${setting}.` : "",
    tone ? `Tone: ${tone}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const prompt = `You are a worldbuilding computer for a tabletop RPG set in ${SETTING}.
Generate a single original non-player character (NPC). ${details}

Return ONLY valid JSON with exactly these fields — no markdown, no explanation:

{
  "name": "Full name",
  "race": "Species or race",
  "class_": "Role, profession, or class",
  "appearance": "2-3 sentences describing their physical appearance",
  "personality": "2-3 sentences describing personality and demeanor",
  "background": "2-3 sentences of backstory",
  "goals": "Their primary motivation or goal in one or two sentences",
  "secrets": "A hidden secret the GM can reveal later"
}`;

  const raw = await echoGenerate(prompt);
  const p = parseJsonResponse(raw, "NPC");

  return {
    name: str(p.name),
    race: str(p.race),
    class_: str(p.class_ ?? p.class),
    appearance: str(p.appearance),
    personality: str(p.personality),
    background: str(p.background),
    goals: str(p.goals),
    secrets: str(p.secrets),
  };
}

// ─── Quest ──────────────────────────────────────────────────────────────────────

/**
 * @param {{ shipName?: string, region?: string, difficulty?: string, factionHint?: string }} context
 */
export async function generateQuest(context = {}) {
  const { shipName, region, difficulty, factionHint } = context;

  const details = [
    shipName ? `Active vessel: ${shipName}.` : "",
    region ? `Region of space: ${region}.` : "",
    difficulty ? `Intended difficulty: ${difficulty}.` : "",
    factionHint ? `A faction that should be involved: ${factionHint}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const prompt = `You are a mission designer for a tabletop RPG set in ${SETTING}.
Generate a single original quest. ${details}

Return ONLY valid JSON with exactly these fields — no markdown, no explanation:

{
  "title": "A short punchy quest title (3-6 words)",
  "description": "2-4 sentences describing the quest premise",
  "objectives": ["objective 1", "objective 2", "objective 3"],
  "rewards": ["reward 1", "reward 2"],
  "difficulty": "easy | medium | hard | epic",
  "factionInvolvement": "One sentence on which factions are involved and how"
}`;

  const raw = await echoGenerate(prompt);
  const p = parseJsonResponse(raw, "quest");

  return {
    title: str(p.title),
    description: str(p.description),
    objectives: arr(p.objectives),
    rewards: arr(p.rewards),
    difficulty: str(p.difficulty || difficulty),
    factionInvolvement: str(p.factionInvolvement),
  };
}

// ─── Lore ──────────────────────────────────────────────────────────────────────

/**
 * @param {string} topic
 * @param {"location"|"kingdom"|"religion"|"faction"|"event"} type
 */
export async function generateLore(topic, type) {
  const prompt = `You are a loremaster for a tabletop RPG set in ${SETTING}.
Generate a detailed lore entry of type "${type}" about: ${topic}.

Return ONLY valid JSON with exactly these fields — no markdown, no explanation:

{
  "name": "The name of this ${type}",
  "type": "${type}",
  "description": "2-4 sentences describing what this is",
  "history": "2-4 sentences of historical background",
  "significance": "Why this matters in the wider galaxy, 1-2 sentences",
  "connections": ["related person, place, or event 1", "connection 2"]
}`;

  const raw = await echoGenerate(prompt);
  const p = parseJsonResponse(raw, "lore");

  return {
    name: str(p.name),
    type: str(p.type || type),
    description: str(p.description),
    history: str(p.history),
    significance: str(p.significance),
    connections: arr(p.connections),
  };
}

// ─── Encounter ──────────────────────────────────────────────────────────────────

/**
 * @param {{ region?: string, threatLevel?: string, shipName?: string }} context
 */
export async function generateEncounter(context = {}) {
  const { region, threatLevel, shipName } = context;

  const details = [
    region ? `Region: ${region}.` : "",
    threatLevel ? `Threat level: ${threatLevel}.` : "",
    shipName ? `Player vessel: ${shipName}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const prompt = `You are an encounter designer for a tabletop RPG set in ${SETTING}.
Generate a single original encounter. ${details}

Return ONLY valid JSON with exactly these fields — no markdown, no explanation:

{
  "title": "A short encounter title (3-6 words)",
  "situation": "2-3 sentences describing the scene the players walk into",
  "adversaries": "Description of the threats, enemies, or hazards present",
  "objectives": "What the players need to accomplish",
  "complications": "An unexpected twist that raises the stakes",
  "resolution": "One possible way the encounter could resolve"
}`;

  const raw = await echoGenerate(prompt);
  const p = parseJsonResponse(raw, "encounter");

  return {
    title: str(p.title),
    situation: str(p.situation),
    adversaries: str(p.adversaries),
    objectives: str(p.objectives),
    complications: str(p.complications),
    resolution: str(p.resolution),
  };
}

// ─── Item ──────────────────────────────────────────────────────────────────────

/**
 * @param {{ type?: string, era?: string, faction?: string }} context
 */
export async function generateItem(context = {}) {
  const { type, era, faction } = context;

  const details = [
    type ? `Item type: ${type}.` : "",
    era ? `Era: ${era}.` : "",
    faction ? `Associated faction: ${faction}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const prompt = `You are an artifact designer for a tabletop RPG set in ${SETTING}.
Generate a single original item, device, or artifact. ${details}

Return ONLY valid JSON with exactly these fields — no markdown, no explanation:

{
  "name": "The name of the item",
  "type": "The kind of item (weapon, tool, relic, technology, etc.)",
  "description": "2-3 sentences describing the item",
  "properties": ["notable property 1", "property 2", "property 3"],
  "origin": "Where this item came from, 1-2 sentences",
  "value": "Its rarity or worth in one short phrase"
}`;

  const raw = await echoGenerate(prompt);
  const p = parseJsonResponse(raw, "item");

  return {
    name: str(p.name),
    type: str(p.type || type),
    description: str(p.description),
    properties: arr(p.properties),
    origin: str(p.origin),
    value: str(p.value),
  };
}

// ─── Faction ──────────────────────────────────────────────────────────────────

/**
 * @param {{ region?: string, alignment?: string, size?: string }} context
 */
export async function generateFaction(context = {}) {
  const { region, alignment, size } = context;

  const details = [
    region ? `Home region: ${region}.` : "",
    alignment ? `Alignment / disposition: ${alignment}.` : "",
    size ? `Approximate size or scope: ${size}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const prompt = `You are a worldbuilding computer for a tabletop RPG set in ${SETTING}.
Generate a single original faction, organization, or power. ${details}

Return ONLY valid JSON with exactly these fields — no markdown, no explanation:

{
  "name": "The name of the faction",
  "type": "The kind of faction (empire, syndicate, order, coalition, etc.)",
  "motto": "A short rallying motto or creed",
  "ideology": "2-3 sentences on what they believe and stand for",
  "goals": ["goal 1", "goal 2"],
  "enemies": ["enemy faction 1", "enemy 2"],
  "allies": ["ally 1", "ally 2"],
  "territory": "Description of the space or worlds they control"
}`;

  const raw = await echoGenerate(prompt);
  const p = parseJsonResponse(raw, "faction");

  return {
    name: str(p.name),
    type: str(p.type),
    motto: str(p.motto),
    ideology: str(p.ideology),
    goals: arr(p.goals),
    enemies: arr(p.enemies),
    allies: arr(p.allies),
    territory: str(p.territory),
  };
}

// ─── Dialogue (never cached) ────────────────────────────────────────────────────

/**
 * @param {{ name: string, race: string, class_: string, personality: string, goals: string, secrets: string }} npc
 * @param {string} situation
 * @param {object} [campaignContext]
 */
export async function generateDialogue(npc = {}, situation = "", campaignContext = {}) {
  const ctxLines = Object.entries(campaignContext)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");

  const prompt = `You are voicing an NPC in a tabletop RPG set in ${SETTING}.

NPC profile:
  Name: ${str(npc.name)}
  Race: ${str(npc.race)}
  Role: ${str(npc.class_ ?? npc.class)}
  Personality: ${str(npc.personality)}
  Goals: ${str(npc.goals)}
  Secret (do not reveal directly): ${str(npc.secrets)}

Current situation: ${situation}
${ctxLines ? `Campaign context: ${ctxLines}` : ""}

Write an in-character dialogue scene. Provide an opening line, two or three
branching player options each with the NPC's response, and a concluding line.
Stay true to the NPC's personality and goals.

Return ONLY valid JSON with exactly these fields — no markdown, no explanation:

{
  "opening": "The NPC's opening line",
  "options": [
    { "playerLine": "A line the player might say", "npcResponse": "How the NPC responds" }
  ],
  "conclusion": "The NPC's closing line as the scene ends"
}`;

  const raw = await echoGenerate(prompt);
  const p = parseJsonResponse(raw, "dialogue");

  const options = Array.isArray(p.options)
    ? p.options.map((o) => ({
        playerLine: str(o?.playerLine),
        npcResponse: str(o?.npcResponse),
      }))
    : [];

  return {
    opening: str(p.opening),
    options,
    conclusion: str(p.conclusion),
  };
}

// ─── Image ──────────────────────────────────────────────────────────────────────

/**
 * @param {"npc_portrait"|"location"|"item"|"faction_banner"|"creature"} imageType
 * @param {string} subject
 * @param {{ width?: number, height?: number, style?: string }} [options]
 */
export async function generateImage(imageType, subject, options = {}) {
  const { width = 512, height = 512, style } = options;

  const styleByType = {
    npc_portrait: "a character portrait, head and shoulders, dramatic lighting",
    location: "a sweeping establishing shot of a place or environment",
    item: "a detailed product render of a single object on a neutral background",
    faction_banner: "an emblem, crest, or banner design, centered and symmetrical",
    creature: "a full-body concept art render of a creature",
  };

  const flavor = styleByType[imageType] ?? "concept art";
  const prompt = `${SETTING} concept art. ${flavor}. ${subject}.${
    style ? ` Art style: ${style}.` : ""
  } High detail, cinematic, science fiction.`;

  const { url, data } = await echoGenerateImage(prompt, width, height);

  return {
    url: url ?? null,
    data: data ?? null,
    prompt,
  };
}

export { EchoUnavailableError };
