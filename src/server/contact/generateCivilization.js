/**
 * generateCivilization.js
 * Procedurally generates a civilization profile for an inhabited planet.
 *
 * Deterministic: the same planet seed always produces the same civilization.
 * No Firestore — pure generation, not yet saved. Follows the same pattern as
 * generateAnomaly.js and generatePlanet.js.
 *
 * Called by firstContactEngine.js after a first contact trigger is detected.
 * The resulting document is persisted there alongside the contact record.
 */

import { createRng } from "../galaxy/seededRandom.js";

// ─── Civilization levels ──────────────────────────────────────────────────────

/** Valid civilization advancement levels. */
export const CIVILIZATION_LEVELS = [
  "pre_warp",
  "industrial",
  "early_space_age",
  "warp_capable",
  "advanced",
  "unknown",
];

const CIVILIZATION_LEVEL_TABLE = [
  { value: "pre_warp",        weight: 35 },
  { value: "industrial",      weight: 25 },
  { value: "early_space_age", weight: 20 },
  { value: "warp_capable",    weight: 12 },
  { value: "advanced",        weight: 3  },
  { value: "unknown",         weight: 5  },
];

// ─── Civilization traits ──────────────────────────────────────────────────────

/** All valid civilization traits. */
export const CIVILIZATION_TRAITS = [
  "peaceful",
  "warlike",
  "isolationist",
  "scientific",
  "religious",
  "expansionist",
  "mysterious",
];

// Primary trait weights — weighted toward more common social structures
const PRIMARY_TRAIT_TABLE = [
  { value: "peaceful",     weight: 20 },
  { value: "warlike",      weight: 15 },
  { value: "isolationist", weight: 18 },
  { value: "scientific",   weight: 17 },
  { value: "religious",    weight: 16 },
  { value: "expansionist", weight: 10 },
  { value: "mysterious",   weight: 4  },
];

// ─── Species name generation ──────────────────────────────────────────────────

// Syllable pools for procedural species name generation
const SYLLABLES_START = [
  "Vor", "Kel", "Tal", "Nex", "Zar", "Mor", "Sen", "Dra", "Vel",
  "Kas", "Tyr", "Lok", "Fen", "Ath", "Gul", "Sev", "Cor", "Dul",
  "Jal", "Bel", "Ori", "Sar", "Tak", "Phor", "Rax", "Ith", "Wex",
];

const SYLLABLES_MID = [
  "an", "or", "el", "ix", "ul", "ar", "en", "is", "on", "ur",
  "al", "er", "in", "oth", "ek", "yl", "im", "od", "et", "ax",
];

const SYLLABLES_END = [
  "ians", "ites", "ans", "ini", "ori", "ari", "eni", "uli", "aki",
  "oni", "ari", "evi", "uri", "eli", "ians", "ites", "osi", "ari",
];

/**
 * Generate a pronounceable alien species name from the seeded RNG.
 * Format: Start + Mid? + End  (2–3 syllable names)
 *
 * @param {object} rng  createRng() instance
 * @returns {string}  e.g. "Voranians", "Tyr-elori", "Kasioni"
 */
function generateSpeciesName(rng) {
  const start = rng.pick(SYLLABLES_START);
  const end   = rng.pick(SYLLABLES_END);

  // ~60% chance of a middle syllable
  if (rng.next() > 0.4) {
    const mid = rng.pick(SYLLABLES_MID);
    return `${start}${mid}${end}`;
  }

  return `${start}${end}`;
}

// ─── Homeworld name generation ────────────────────────────────────────────────

const HOMEWORLD_PREFIXES = [
  "Vor", "Kel", "Tal", "Nex", "Kas", "Mor", "Sen", "Dra",
  "Gul", "Ath", "Lok", "Tyr", "Ori", "Bel", "Cor", "Sar",
];

const HOMEWORLD_SUFFIXES = [
  "Prime", "Major", "III", "IV", "Alpha", "Secundus", "Dominion",
  "Core", "Magna", "Primus", "Delta", "Tertius",
];

/**
 * Generate a homeworld name for the species.
 *
 * @param {object} rng
 * @returns {string}  e.g. "Vor Prime", "Kastyr Delta"
 */
function generateHomeworldName(rng) {
  const prefix = rng.pick(HOMEWORLD_PREFIXES);
  const suffix = rng.pick(HOMEWORLD_SUFFIXES);
  // ~40% chance of a combined prefix for more exotic names
  if (rng.next() > 0.6) {
    const prefix2 = rng.pick(HOMEWORLD_PREFIXES);
    return `${prefix}${prefix2.toLowerCase()} ${suffix}`;
  }
  return `${prefix} ${suffix}`;
}

// ─── Trait selection ──────────────────────────────────────────────────────────

/**
 * Select 2–3 traits for a civilization.
 * The primary trait is weighted; secondaries are drawn from the remaining pool.
 *
 * @param {object} rng
 * @returns {string[]}  Array of 2–3 unique traits, primary first
 */
function selectTraits(rng) {
  const primary = rng.weighted(PRIMARY_TRAIT_TABLE);
  const pool    = CIVILIZATION_TRAITS.filter((t) => t !== primary);

  // Pick 1 or 2 secondary traits
  const secondaryCount = rng.next() > 0.4 ? 2 : 1;
  const secondaries    = [];

  for (let i = 0; i < secondaryCount && pool.length > 0; i++) {
    const idx = rng.int(0, pool.length - 1);
    secondaries.push(pool.splice(idx, 1)[0]);
  }

  return [primary, ...secondaries];
}

// ─── Population size descriptors ─────────────────────────────────────────────

const POPULATION_BY_LEVEL = {
  pre_warp:        ["Thousands", "Tens of thousands", "Hundreds of thousands"],
  industrial:      ["Millions", "Hundreds of millions"],
  early_space_age: ["Hundreds of millions", "Billions"],
  warp_capable:    ["Billions", "Multiple billions"],
  advanced:        ["Unknown — spans multiple worlds"],
  unknown:         ["Unknown"],
};

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Generate a full civilization profile from a deterministic seed.
 *
 * The same seed always returns the same civilization — a planet scanned
 * multiple times encounters the same species with the same characteristics.
 *
 * @param {number|string} seed  Planet seed (from planetSeed() in seedGenerator.js)
 * @param {string}        [planetId]  Firestore planet ID (null until planet is saved)
 * @returns {object}  Civilization document (not yet persisted)
 */
export function generateCivilization(seed, planetId = null) {
  const rng = createRng(seed);

  const level       = rng.weighted(CIVILIZATION_LEVEL_TABLE);
  const traits      = selectTraits(rng);
  const speciesName = generateSpeciesName(rng);
  const homeworld   = generateHomeworldName(rng);

  const popPool   = POPULATION_BY_LEVEL[level] ?? ["Unknown"];
  const population = popPool[rng.int(0, popPool.length - 1)];

  return {
    planetId,
    speciesName,
    homeworld,
    civilizationLevel: level,
    traits,
    primaryTrait:      traits[0],
    population,
    diplomaticStatus:  "uncontacted",   // updated after first contact occurs
    firstContactShip:  null,            // filled in by firstContactEngine
    firstContactStardate: null,
  };
}
