export type ComputerMemory = {
  lastCommand?: string;
  lastResult?: any;
  lastContext?: string;
};

const shipMemory: Record<string, ComputerMemory> = {};

export function getMemory(shipId: string): ComputerMemory {
  if (!shipMemory[shipId]) {
    shipMemory[shipId] = {};
  }
  return shipMemory[shipId];
}

export function updateMemory(
  shipId: string,
  data: Partial<ComputerMemory>,
): ComputerMemory {
  const memory = getMemory(shipId);

  shipMemory[shipId] = {
    ...memory,
    ...data,
  };

  return shipMemory[shipId];
}
