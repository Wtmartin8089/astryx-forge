/**
 * seedGenerator.js
 * Cascading deterministic seed generation rooted at GALAXY_SEED.
 *
 * Seed hierarchy:
 *   galaxy  → GALAXY_SEED (constant)
 *   sector  → generateSeed(designation)
 *   system  → generateSeed(`${sectorSeed}:${systemIndex}`)
 *   planet  → generateSeed(`${systemSeed}:${orbitalIndex}`)
 *
 * The same input always produces the same 32-bit numeric seed.
 * Seeds are numeric so createRng() skips its internal string hashing step,
 * giving a stable, well-defined RNG entry point at each level.
 */

import { GALAXY_SEED } from "../../../config/galaxySeed.js";

// ─── FNV-1a 32-bit hash ───────────────────────────────────────────────────────
// Same algorithm as seededRandom.js hashString — kept in sync intentionally.

function fnv1a32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Hash GALAXY_SEED + input into a stable 32-bit unsigned integer.
 *
 * @param {string|number} input
 * @returns {number}  32-bit unsigned integer seed
 */
export function generateSeed(input) {
  return fnv1a32(`${GALAXY_SEED}:${input}`);
}

// ─── Cascade helpers ──────────────────────────────────────────────────────────

/**
 * Sector-level seed.
 * @param {string} designation  e.g. "DQ-07"
 * @returns {number}
 */
export function sectorSeed(designation) {
  return generateSeed(designation);
}

/**
 * System-level seed. Derived from the parent sector seed + system index.
 * @param {number} parentSectorSeed
 * @param {number} systemIndex  0-based position within the sector
 * @returns {number}
 */
export function systemSeed(parentSectorSeed, systemIndex) {
  return generateSeed(`${parentSectorSeed}:${systemIndex}`);
}

/**
 * Planet-level seed. Derived from the parent system seed + orbital index.
 * @param {number} parentSystemSeed
 * @param {number} orbitalIndex  0-based orbital position
 * @returns {number}
 */
export function planetSeed(parentSystemSeed, orbitalIndex) {
  return generateSeed(`${parentSystemSeed}:${orbitalIndex}`);
}
