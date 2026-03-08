/**
 * In-memory short-term context store for the ship computer.
 * Scope: process lifetime (serverless warm instance memory).
 */

const shipMemory = {};

export function getMemory(shipId) {
  const key = shipId || "unknown-ship";
  if (!shipMemory[key]) {
    shipMemory[key] = {};
  }
  return shipMemory[key];
}

export function updateMemory(shipId, data) {
  const key = shipId || "unknown-ship";
  const memory = getMemory(key);

  shipMemory[key] = {
    ...memory,
    ...(data || {}),
  };

  return shipMemory[key];
}
