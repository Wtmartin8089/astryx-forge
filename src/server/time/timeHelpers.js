/**
 * timeHelpers.js
 * Pure helper functions for Star Trek stardate arithmetic and formatting.
 *
 * No Firestore dependencies — safe to import in any module including client code.
 *
 * Stardate system (game conventions):
 *   Format:   XXYYZ.F  (integer part = campaign date, F = fractional)
 *   Start:    53100.0  (year 2376, shortly after the Dominion War)
 *   Tick:     0.1 per 10-second server tick
 *   One full stardate unit (x.0 → x+1.0) = 100 ticks = ~16.7 minutes real time
 *
 * Crew shift schedule (based on fractional part of stardate):
 *   Alpha   0.00 – 0.33   day watch
 *   Beta    0.33 – 0.66   evening watch
 *   Gamma   0.66 – 1.00   overnight watch
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Canonical game start time. Year 2376, post-Dominion War. */
export const STARTING_STARDATE = 53100.0;

/**
 * Stardate units advanced per 10-second tick.
 * 10 ticks = 1.0 stardate unit ≈ 100 seconds real time per full unit.
 */
export const TICK_INCREMENT = 0.1;

/** Shift boundary constants for external comparisons. */
export const SHIFT_BOUNDARIES = {
  ALPHA_START: 0.0,
  BETA_START:  0.33,
  GAMMA_START: 0.66,
};

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Format a stardate number to one decimal place string.
 *
 * @param {number} stardate
 * @returns {string}  e.g. "53122.7"
 */
export function stardateToString(stardate) {
  return stardate.toFixed(1);
}

// ─── Arithmetic ───────────────────────────────────────────────────────────────

/**
 * Return the fractional component of a stardate (the decimal part only).
 * Used to determine crew shift, event phase, etc.
 *
 * @param {number} stardate
 * @returns {number}  0.0 – 0.9 (one decimal precision)
 */
export function stardateFractional(stardate) {
  return parseFloat((stardate % 1).toFixed(1));
}

/**
 * Advance a stardate by one tick (TICK_INCREMENT).
 * Rounds to one decimal place to prevent floating-point drift across ticks.
 *
 * @param {number} stardate
 * @returns {number}
 */
export function incrementStardate(stardate) {
  return parseFloat((stardate + TICK_INCREMENT).toFixed(1));
}

/**
 * Return the elapsed stardate units between two stardates.
 *
 * @param {number} from  Earlier stardate
 * @param {number} to    Later stardate
 * @returns {number}     Difference, rounded to 1 decimal
 */
export function stardateElapsed(from, to) {
  return parseFloat((to - from).toFixed(1));
}

/**
 * Return true if the current stardate has reached or passed a trigger stardate.
 * Used by the warp engine and event scheduler.
 *
 * @param {number} current    Universal current stardate
 * @param {number} trigger    Target stardate to test
 * @returns {boolean}
 */
export function stardateReached(current, trigger) {
  return current >= trigger;
}

/**
 * Compute the projected arrival stardate given a departure stardate and
 * the number of ticks the journey will take.
 *
 * @param {number} departureStardate
 * @param {number} tickCount          Number of 10-second ticks until arrival
 * @returns {number}
 */
export function computeArrivalStardate(departureStardate, tickCount) {
  return parseFloat((departureStardate + tickCount * TICK_INCREMENT).toFixed(1));
}

// ─── Shift system ─────────────────────────────────────────────────────────────

/**
 * Return the current crew shift name based on the fractional part of a stardate.
 *
 * Alpha   0.00 – 0.33   (day watch)
 * Beta    0.33 – 0.66   (evening watch)
 * Gamma   0.66 – 1.00   (overnight watch)
 *
 * @param {number} stardate
 * @returns {"alpha" | "beta" | "gamma"}
 */
export function getCurrentShift(stardate) {
  const frac = stardateFractional(stardate);
  if (frac < SHIFT_BOUNDARIES.BETA_START)  return "alpha";
  if (frac < SHIFT_BOUNDARIES.GAMMA_START) return "beta";
  return "gamma";
}

/**
 * Return human-readable shift label for display.
 *
 * @param {number} stardate
 * @returns {string}  "Alpha Shift" | "Beta Shift" | "Gamma Shift"
 */
export function getShiftLabel(stardate) {
  const shift = getCurrentShift(stardate);
  return shift.charAt(0).toUpperCase() + shift.slice(1) + " Shift";
}

// ─── Event logging ────────────────────────────────────────────────────────────

/**
 * Attach the current stardate to any event or data object.
 * The source event is not mutated — a new object is returned.
 *
 * @param {object} event     Any object representing an event or record
 * @param {number} stardate  Current universal stardate
 * @returns {object}         Event with stardate, stardateLabel, and shift attached
 */
export function timestampEvent(event, stardate) {
  return {
    ...event,
    stardate:      parseFloat(stardate.toFixed(1)),
    stardateLabel: `Stardate ${stardateToString(stardate)}`,
    shift:         getCurrentShift(stardate),
  };
}

/**
 * Build a structured log entry for a major game event.
 *
 * Example output:
 *   {
 *     description:   "USS King detected unknown anomaly",
 *     stardate:      53122.7,
 *     stardateLabel: "Stardate 53122.7",
 *     shift:         "gamma",
 *     timestamp:     "2024-01-01T00:00:00.000Z",
 *     shipId:        "uss-king",
 *     sector:        "DQ-07",
 *   }
 *
 * @param {string} description  Short event description
 * @param {object} details      Arbitrary context (shipId, sector, systemId, etc.)
 * @param {number} stardate     Current universal stardate
 * @returns {object}
 */
export function formatLogEntry(description, details, stardate) {
  return {
    description,
    stardate:      parseFloat(stardate.toFixed(1)),
    stardateLabel: `Stardate ${stardateToString(stardate)}`,
    shift:         getCurrentShift(stardate),
    timestamp:     new Date().toISOString(),
    ...details,
  };
}
