/**
 * generateSystem.js
 * Procedurally generates a star system inside a sector.
 */

import { createRng } from "./seededRandom.js";
import { generatePlanet } from "./generatePlanet.js";
import { systemSeed } from "./seedGenerator.js";
import { generateAnomaly, ANOMALY_SCALE_TABLE } from "../anomalies/generateAnomaly.js";

const STAR_TYPES = [
  { value: "Yellow Dwarf (G)",  weight: 30 },
  { value: "Orange Dwarf (K)",  weight: 25 },
  { value: "Red Dwarf (M)",     weight: 20 },
  { value: "White Dwarf",       weight: 8  },
  { value: "Blue Giant (B)",    weight: 6  },
  { value: "Neutron Star",      weight: 4  },
  { value: "Binary System",     weight: 5  },
  { value: "Pulsar",            weight: 1  },
  { value: "Red Supergiant",    weight: 1  },
];

/**
 * @param {string} sectorId
 * @param {string} seed      Deterministic seed (sectorDesignation:index)
 * @param {number} index     System index within sector (0-based)
 * @param {{ x:number, y:number, z:number }} sectorOrigin  Sector's 3D offset
 * @returns {{ system: object, planets: object[], anomaly: object|null }}
 */
export function generateSystem(sectorId, seed, index, sectorOrigin = { x: 0, y: 0, z: 0 }) {
  const sysSeed = systemSeed(seed, index);
  const rng     = createRng(sysSeed);

  const starType      = rng.weighted(STAR_TYPES);
  const planetCount   = rng.int(2, 8);
  const asteroidBelts = rng.int(0, 2);
  const anomalyScale  = rng.weighted(ANOMALY_SCALE_TABLE);

  const coords = rng.coordInSector(sectorOrigin.x, sectorOrigin.y, sectorOrigin.z);

  const letters         = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const provisionalName = `${seed}-${letters[index] ?? index}`;

  const system = {
    sectorId,
    provisionalName,
    displayName:       null,
    starType,
    planetCount,
    asteroidBelts,
    anomalyPresent:    anomalyScale !== "none",
    masked:            true,   // Hidden from players at generation
    explorationLevel:  0,      // 0 = hidden
    xCoord:            coords.x,
    yCoord:            coords.y,
    zCoord:            coords.z,
    discoveredByShip:  null,
    discoveredStardate: null,
    generatedSeed:     sysSeed,
  };

  // Generate planets — each uses the system seed cascaded with orbital index
  const planets = Array.from({ length: planetCount }, (_, i) =>
    generatePlanet(null, sysSeed, i)
  );

  // Generate full anomaly document using dedicated generator
  const anomaly = generateAnomaly({
    systemId: null,     // filled in after system is saved to Firestore
    scale:    anomalyScale,
    seed:     sysSeed,  // deterministic: same system always gets the same anomaly
  });

  return { system, planets, anomaly };
}
