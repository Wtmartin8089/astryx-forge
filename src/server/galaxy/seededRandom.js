/**
 * seededRandom.js
 * Deterministic pseudo-random number generation (mulberry32 algorithm).
 * The same seed always produces the same sequence.
 */

/** Hash a string to a 32-bit unsigned integer for use as an RNG seed. */
function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * Create a seeded random number generator.
 * @param {string|number} seed
 * @returns {{ next: () => number, int: (min:number, max:number) => number, pick: (arr:any[]) => any, weighted: (items:{value:any,weight:number}[]) => any }}
 */
export function createRng(seed) {
  let s = typeof seed === "string" ? hashString(seed) : (seed >>> 0);

  function next() {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Inclusive integer in [min, max] */
  function int(min, max) {
    return Math.floor(next() * (max - min + 1)) + min;
  }

  /** Pick a random element from an array */
  function pick(arr) {
    return arr[int(0, arr.length - 1)];
  }

  /**
   * Weighted selection.
   * @param {{ value: any, weight: number }[]} items
   */
  function weighted(items) {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let roll = next() * total;
    for (const item of items) {
      roll -= item.weight;
      if (roll <= 0) return item.value;
    }
    return items[items.length - 1].value;
  }

  /**
   * Generate a 3D coordinate within a sector volume.
   * Each sector occupies a 100-unit cube.
   */
  function coordInSector(sectorX = 0, sectorY = 0, sectorZ = 0) {
    return {
      x: parseFloat((sectorX * 100 + next() * 100).toFixed(2)),
      y: parseFloat((sectorY * 100 + next() * 100).toFixed(2)),
      z: parseFloat((sectorZ * 100 + next() * 100).toFixed(2)),
    };
  }

  return { next, int, pick, weighted, coordInSector };
}
