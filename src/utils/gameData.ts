import defaultShipsJson from "../data/shipsData.json";
import defaultCrewJson from "../data/crewData.json";
import type { ShipData, CrewMember } from "../types/fleet";

const defaultShips = defaultShipsJson as Record<string, ShipData>;
const defaultCrew = defaultCrewJson as Record<string, CrewMember>;

export function getShips(): Record<string, ShipData> {
  const saved = localStorage.getItem("shipsData");
  return saved ? JSON.parse(saved) : structuredClone(defaultShips);
}

export function saveShips(ships: Record<string, ShipData>) {
  localStorage.setItem("shipsData", JSON.stringify(ships));
}

export function getCrew(): Record<string, CrewMember> {
  const saved = localStorage.getItem("crewData");
  return saved ? JSON.parse(saved) : structuredClone(defaultCrew);
}

export function saveCrew(crew: Record<string, CrewMember>) {
  localStorage.setItem("crewData", JSON.stringify(crew));
}

export function resetToDefaults() {
  localStorage.removeItem("shipsData");
  localStorage.removeItem("crewData");
}

export const RANKS = [
  "Fleet Admiral", "Admiral", "Vice Admiral", "Rear Admiral", "Commodore",
  "Captain", "Commander", "Lt. Commander", "Lieutenant", "Lt. Junior Grade",
  "Ensign", "Cadet",
  "Master Chief Petty Officer", "Senior Chief Petty Officer", "Chief Petty Officer",
  "Petty Officer 1st Class", "Petty Officer 2nd Class", "Petty Officer 3rd Class",
  "Crewman 1st Class", "Crewman 2nd Class", "Crewman 3rd Class",
];
