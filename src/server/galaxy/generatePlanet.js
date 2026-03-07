/**
 * generatePlanet.js
 * Procedurally generates a planet for a given system and orbital index.
 * Deterministic: same systemId + orbitalIndex always produces the same planet.
 */

import { createRng } from "./seededRandom.js";
import { planetSeed } from "./seedGenerator.js";

const PLANET_CLASSES = [
  { value: "Class M", weight: 12 },   // Earth-like, habitable
  { value: "Class H", weight: 10 },   // Desert, marginal
  { value: "Class K", weight: 10 },   // Adaptable, thin atmosphere
  { value: "Class L", weight: 8  },   // Marginally habitable
  { value: "Class D", weight: 15 },   // Dwarf / barren rock
  { value: "Class J", weight: 10 },   // Gas giant (jovian)
  { value: "Class Y", weight: 5  },   // Demon planet, toxic
  { value: "Class N", weight: 5  },   // Sulfuric, Venus-like
  { value: "Barren moon", weight: 12 },
  { value: "Ice world",   weight: 8  },
  { value: "Gas giant",   weight: 5  },
];

const ATMOSPHERES = [
  "None", "Thin", "Standard", "Dense", "Toxic", "Methane", "Sulfuric", "Nitrogen-Oxygen",
];

const TEMP_BANDS = [
  "Frozen", "Arctic", "Cold", "Temperate", "Warm", "Hot", "Scorching",
];

const CIV_LEVELS = [
  { value: "none",           weight: 75 },
  { value: "primitive",      weight: 15 },
  { value: "developing",     weight: 6  },
  { value: "warp_capable",   weight: 3  },
  { value: "advanced",       weight: 1  },
];

const habitableClasses = new Set(["Class M", "Class H", "Class K", "Class L"]);

/**
 * @param {string} systemId
 * @param {string} baseSeed   From the parent sector/system seed
 * @param {number} orbitalIndex
 * @returns {object}  Planet document (not yet saved to Firestore)
 */
export function generatePlanet(systemId, baseSeed, orbitalIndex) {
  const rng = createRng(planetSeed(baseSeed, orbitalIndex));

  const planetClass = rng.weighted(PLANET_CLASSES);
  const isHabitable = habitableClasses.has(planetClass);

  const moons         = rng.int(0, planetClass.includes("giant") ? 12 : 3);
  const gravity       = parseFloat((0.1 + rng.next() * 2.9).toFixed(2));
  const atmosphere    = rng.pick(ATMOSPHERES);
  const tempBand      = rng.pick(TEMP_BANDS);
  const lifeSignsRoll = rng.next();
  const lifeSigns     = isHabitable ? lifeSignsRoll > 0.4 : lifeSignsRoll > 0.95;
  const civLevel      = lifeSigns && isHabitable ? rng.weighted(CIV_LEVELS) : "none";

  const ordinals      = ["I","II","III","IV","V","VI","VII","VIII"];
  const provisionalName = `System-P${ordinals[orbitalIndex] ?? (orbitalIndex + 1)}`;

  return {
    systemId,
    orbitalIndex,
    provisionalName,
    displayName:       null,            // Revealed after survey
    planetClass,
    moons,
    gravity,
    atmosphere,
    temperatureBand:   tempBand,
    lifeSigns,
    civilizationLevel: civLevel,
    resources:         isHabitable ? (rng.next() > 0.5 ? "Moderate" : "Rich") : "Minimal",
    surveyStatus:      0,               // 0 = unknown, hidden from players
    discoveredByShip:  null,
    discoveredStardate: null,
  };
}
