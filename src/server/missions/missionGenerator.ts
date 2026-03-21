import { missionTemplates, getTemplate } from "../../data/missionTemplates";
import type { Mission } from "../../types/mission";
import { getCampaignStardate } from "../../utils/campaignStardate";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function currentStardate(): number { return parseFloat(getCampaignStardate()); }

/**
 * Generate a mission object from a template type and system name.
 * If templateType is omitted, a random template is chosen.
 * Does NOT write to Firestore — call the missions service to persist it.
 */
export function generateMission(
  templateType?: string,
  systemName?: string
): Omit<Mission, "id"> {
  const type = templateType && missionTemplates[templateType]
    ? templateType
    : pick(Object.keys(missionTemplates));

  const template = getTemplate(type)!;
  const system = systemName?.trim() || "Unknown System";

  const complication = pick(template.complications);
  const discovery = pick(template.discoveries);

  // Build a briefing by combining the hook with specific context
  const briefing =
    `${template.hook.replace(/\.$/, "")} in the ${system} region. ` +
    `Initial long-range scans indicate ${complication}. ` +
    `Preliminary data suggests the possibility of ${discovery}.`;

  return {
    title: `${template.name}: ${system}`,
    type,
    system,
    briefing,
    objectives: template.objectives,
    complication,
    discovery,
    possibleOutcomes: template.possibleOutcomes,
    status: "active",
    stardate: currentStardate(),
    createdAt: Date.now(),
  };
}

/**
 * Generate a mission with a custom title override.
 */
export function generateNamedMission(
  title: string,
  templateType: string,
  systemName: string,
  briefingOverride?: string
): Omit<Mission, "id"> {
  const base = generateMission(templateType, systemName);
  return {
    ...base,
    title,
    ...(briefingOverride ? { briefing: briefingOverride } : {}),
  };
}
