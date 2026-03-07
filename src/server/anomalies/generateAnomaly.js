/**
 * generateAnomaly.js
 * Full anomaly generation for star systems.
 *
 * Called during system generation to produce a rich anomaly document.
 * The document is NOT yet saved here — persistence is handled by
 * loadOrGenerateSector.js, which writes all children after saving the sector.
 *
 * Probabilities per system:
 *   none   70%
 *   minor  20%
 *   major   8%
 *   rare    2%
 *
 * Categories (weighted by intensity — rarer = more exotic):
 *   spatial    natural space phenomena
 *   scientific unusual lifeforms / particle events
 *   temporal   time-related distortions
 *   artificial alien or derelict technology
 */

import { createRng } from "../galaxy/seededRandom.js";

// ─── Intensity table (used by generateSystem to roll the scale) ───────────────

export const ANOMALY_SCALE_TABLE = [
  { value: "none",  weight: 70 },
  { value: "minor", weight: 20 },
  { value: "major", weight: 8  },
  { value: "rare",  weight: 2  },
];

// ─── Category weights by intensity ────────────────────────────────────────────

const CATEGORY_WEIGHTS = {
  minor: [
    { value: "spatial",    weight: 50 },
    { value: "scientific", weight: 30 },
    { value: "temporal",   weight: 15 },
    { value: "artificial", weight: 5  },
  ],
  major: [
    { value: "spatial",    weight: 35 },
    { value: "scientific", weight: 30 },
    { value: "temporal",   weight: 20 },
    { value: "artificial", weight: 15 },
  ],
  rare: [
    { value: "spatial",    weight: 15 },
    { value: "scientific", weight: 20 },
    { value: "temporal",   weight: 35 },
    { value: "artificial", weight: 30 },
  ],
};

// ─── Anomaly type definitions by category ────────────────────────────────────

const ANOMALY_TYPES = {
  spatial: [
    {
      type:        "Subspace distortion",
      description: "A region of destabilized subspace folding space around a dense gravitational mass.",
      resolution:  "Navigate through at reduced speed using precision maneuvering thrusters.",
    },
    {
      type:        "Dark matter cloud",
      description: "A diffuse cloud of dark matter interfering with long-range sensors and navigation.",
      resolution:  "Deploy a graviton pulse to map the cloud boundary before transiting.",
    },
    {
      type:        "Quantum fluctuation",
      description: "Unpredictable quantum instability warping local spacetime geometry.",
      resolution:  "Modulate shield harmonics to counteract the quantum variance field.",
    },
    {
      type:        "Gravitational lens",
      description: "A massive hidden object bending light and distorting navigational data.",
      resolution:  "Recalibrate sensors to compensate for gravitational curvature effects.",
    },
    {
      type:        "Subspace fold",
      description: "A pocket of collapsed subspace compressing interstellar distances unpredictably.",
      resolution:  "Emit a focused subspace compression wave to stabilize the fold.",
    },
  ],
  temporal: [
    {
      type:        "Temporal rift",
      description: "A tear in the spacetime continuum with measurable chronometric variance across its boundary.",
      resolution:  "Fire a modulated inverse chroniton pulse from the main deflector.",
    },
    {
      type:        "Temporal distortion",
      description: "Local time dilation creating pockets where time accelerates or slows dramatically.",
      resolution:  "Maintain structural integrity fields at maximum and transit at minimum warp.",
    },
    {
      type:        "Tachyon surge",
      description: "A sustained burst of faster-than-light particles indicating severe temporal stress.",
      resolution:  "Reverse-polarize the deflector array to absorb the tachyon influx.",
    },
    {
      type:        "Chroniton field",
      description: "Dense residual chroniton particles — evidence of a past or future temporal event nearby.",
      resolution:  "Isolate and contain a chroniton sample for analysis before the field decays.",
    },
  ],
  scientific: [
    {
      type:        "Energy lifeform",
      description: "A non-corporeal entity composed of pure energy. Origin and intent unknown.",
      resolution:  "Attempt non-verbal communication using modulated electromagnetic pulses.",
    },
    {
      type:        "Dark matter filament",
      description: "A thin thread of dark matter connecting two gravitational bodies across thousands of kilometers.",
      resolution:  "Study the filament geometry for clues to the dark matter source object.",
    },
    {
      type:        "Ion storm",
      description: "A violent electromagnetic storm severely disrupting communications and sensor arrays.",
      resolution:  "Rotate shield frequency and weather the storm at station-keeping.",
    },
    {
      type:        "Quantum singularity",
      description: "A localized quantum black hole of uncertain origin — natural or artificially induced.",
      resolution:  "Maintain safe distance; fire a graviton beam to measure event horizon stability.",
    },
    {
      type:        "Pulsar radiation burst",
      description: "Focused beams of high-energy radiation sweeping the system from a dense stellar remnant.",
      resolution:  "Synchronize shield rotation to the pulsar period and shelter behind a planetary body.",
    },
  ],
  artificial: [
    {
      type:        "Alien probe",
      description: "An automated probe of unknown origin, transmitting on frequencies not in Federation databases.",
      resolution:  "Attempt to decode the transmission protocol and respond in kind.",
    },
    {
      type:        "Derelict vessel",
      description: "A drifting spacecraft, silent and heavily damaged. Hull markings are unrecognizable.",
      resolution:  "Conduct a remote scan before sending an away team to board carefully.",
    },
    {
      type:        "Ancient array",
      description: "A network of dormant transmitters arranged in precise geometric patterns, age indeterminate.",
      resolution:  "Apply power to the array using a controlled energy transfer beam.",
    },
    {
      type:        "Signal beacon",
      description: "A repeating automated signal with no match in known records, looping on a fixed interval.",
      resolution:  "Triangulate the signal origin and approach at low power to avoid triggering defenses.",
    },
  ],
};

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Generate a full anomaly document for a star system.
 * Returns null if scale is "none".
 *
 * @param {object} params
 * @param {string|null} params.systemId   Firestore system ID (null until system is saved)
 * @param {string}      params.scale      "minor" | "major" | "rare"
 * @param {number}      params.seed       Numeric seed for deterministic generation
 * @returns {object|null}
 */
export function generateAnomaly({ systemId, scale, seed }) {
  if (scale === "none") return null;

  const rng = createRng(seed);

  const categoryTable = CATEGORY_WEIGHTS[scale];
  const category      = rng.weighted(categoryTable);
  const typePool      = ANOMALY_TYPES[category];
  const chosen        = typePool[rng.int(0, typePool.length - 1)];

  return {
    systemId,                        // filled in after system is saved
    type:               chosen.type,
    category,
    intensity:          scale,       // "minor" | "major" | "rare"
    description:        chosen.description,
    resolutionHint:     chosen.resolution,
    investigationLevel: 0,           // 0 = unknown
    status:             "undetected",
    discoveredBy:       null,
    discoveredStardate: null,
  };
}
