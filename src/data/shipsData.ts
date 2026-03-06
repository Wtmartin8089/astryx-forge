import { getShips as getShipData } from "../utils/gameData";

export interface Ship {
  id: string;
  name: string;
  registry: string;
}

export function getShips(): Record<string, Ship> {
  const raw = getShipData();
  const ships: Record<string, Ship> = {};
  for (const [id, data] of Object.entries(raw)) {
    ships[id] = { id, name: data.name, registry: data.registry };
  }
  return ships;
}
