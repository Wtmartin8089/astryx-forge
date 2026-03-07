/**
 * generateSector.js
 * Procedurally generates a sector from a designation string.
 * Deterministic: same designation always produces the same sector.
 */

import { createRng } from "./seededRandom.js";
import { generateSystem } from "./generateSystem.js";
import { sectorSeed } from "./seedGenerator.js";

const SYSTEM_COUNT_TABLE = [
  { value: 2, weight: 20 },
  { value: 3, weight: 35 },
  { value: 4, weight: 30 },
  { value: 5, weight: 15 },
];

const SECTOR_TRAITS = [
  "Sparse frontier",
  "Dense stellar cluster",
  "Nebula-fringe region",
  "High-radiation zone",
  "Ancient debris field",
  "Subspace instability corridor",
];

/**
 * Parses a sector designation like "DQ-07" into grid coordinates.
 * Convention: two-letter quadrant prefix + two-digit index.
 * Returns { x, y, z } sector-grid offsets for 3D placement.
 */
function designationToOrigin(designation) {
  // Hash the designation into stable grid coordinates
  let h = 0;
  for (let i = 0; i < designation.length; i++) {
    h = (Math.imul(h, 31) + designation.charCodeAt(i)) >>> 0;
  }
  // Map to a [-50, 50] grid of sectors (arbitrary world scale)
  const x = ((h & 0xff) % 101) - 50;
  const y = (((h >>> 8) & 0xff) % 101) - 50;
  const z = (((h >>> 16) & 0xff) % 21) - 10;
  return { x, y, z };
}

/**
 * @param {string} campaignId
 * @param {string} designation  e.g. "DQ-07"
 * @returns {{ sector: object, systems: object[], planets: object[], anomalies: object[] }}
 */
export function generateSector(campaignId, designation) {
  const seed = sectorSeed(designation);
  const rng  = createRng(seed);

  const systemCount = rng.weighted(SYSTEM_COUNT_TABLE);
  const trait       = rng.pick(SECTOR_TRAITS);
  const origin      = designationToOrigin(designation);

  const sector = {
    campaignId,
    designation,
    trait,
    systemCount,
    xOrigin:       origin.x,
    yOrigin:       origin.y,
    zOrigin:       origin.z,
    generated:     true,
    generatedSeed: seed,
    generatedAt:   null, // set to serverTimestamp() on save
  };

  const allSystems   = [];
  const allPlanets   = [];
  const allAnomalies = [];

  for (let i = 0; i < systemCount; i++) {
    const { system, planets, anomaly } = generateSystem(
      null,   // sectorId — filled in after sector is saved
      seed,   // numeric sector seed cascades into system generation
      i,
      origin,
    );
    allSystems.push(system);
    allPlanets.push(...planets);
    if (anomaly) allAnomalies.push(anomaly);
  }

  return { sector, systems: allSystems, planets: allPlanets, anomalies: allAnomalies };
}
