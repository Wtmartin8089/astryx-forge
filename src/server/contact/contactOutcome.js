/**
 * contactOutcome.js
 * Pure function: given a civilization and a captain's chosen action,
 * compute the outcome of a first contact encounter.
 *
 * No Firestore — all logic is synchronous.
 * Called by firstContactEngine.js after the captain submits a decision.
 *
 * Outcome is partially randomized so the same action isn't always guaranteed
 * to succeed — civilizations have individual variation within their traits.
 * Math.random() is used here intentionally: unlike world generation,
 * player decisions happen in real-time and benefit from non-determinism.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Valid captain actions. */
export const CAPTAIN_ACTIONS = [
  "observe",
  "initiate_communication",
  "send_diplomatic_envoy",
  "remain_hidden",
];

/** Valid contact outcomes. */
export const CONTACT_OUTCOMES = [
  "friendly",
  "fearful",
  "hostile",
  "curious",
  "neutral",
];

/** Diplomatic status values resulting from each outcome. */
const DIPLOMATIC_STATUS_BY_OUTCOME = {
  friendly:  "diplomatic_relations",
  fearful:   "cautious_exchange",
  hostile:   "hostile_standoff",
  curious:   "first_contact_established",
  neutral:   "observation_only",
};

// ─── Outcome matrix ───────────────────────────────────────────────────────────
// Format: trait → action → [weighted outcomes: [outcome, weight], ...]
// Math.random() selects from the weighted pool for variety within a trait type.

const OUTCOME_MATRIX = {
  peaceful: {
    observe:                 [["curious", 50], ["neutral", 35], ["friendly", 15]],
    initiate_communication:  [["friendly", 55], ["curious", 35], ["neutral", 10]],
    send_diplomatic_envoy:   [["friendly", 70], ["curious", 20], ["neutral", 10]],
    remain_hidden:           [["neutral", 70], ["curious", 30]],
  },
  warlike: {
    observe:                 [["neutral", 45], ["hostile", 30], ["fearful", 25]],
    initiate_communication:  [["hostile", 45], ["fearful", 30], ["neutral", 25]],
    send_diplomatic_envoy:   [["hostile", 40], ["neutral", 35], ["curious", 25]],
    remain_hidden:           [["neutral", 65], ["hostile", 35]],
  },
  isolationist: {
    observe:                 [["neutral", 60], ["fearful", 25], ["hostile", 15]],
    initiate_communication:  [["fearful", 45], ["hostile", 35], ["neutral", 20]],
    send_diplomatic_envoy:   [["hostile", 50], ["fearful", 30], ["neutral", 20]],
    remain_hidden:           [["neutral", 80], ["curious", 20]],
  },
  scientific: {
    observe:                 [["curious", 55], ["neutral", 35], ["friendly", 10]],
    initiate_communication:  [["curious", 55], ["friendly", 30], ["neutral", 15]],
    send_diplomatic_envoy:   [["friendly", 50], ["curious", 40], ["neutral", 10]],
    remain_hidden:           [["curious", 60], ["neutral", 40]],
  },
  religious: {
    observe:                 [["neutral", 45], ["curious", 35], ["fearful", 20]],
    initiate_communication:  [["fearful", 35], ["curious", 35], ["friendly", 30]],
    send_diplomatic_envoy:   [["friendly", 40], ["fearful", 35], ["curious", 25]],
    remain_hidden:           [["neutral", 70], ["curious", 30]],
  },
  expansionist: {
    observe:                 [["neutral", 50], ["curious", 30], ["hostile", 20]],
    initiate_communication:  [["curious", 40], ["hostile", 35], ["neutral", 25]],
    send_diplomatic_envoy:   [["neutral", 45], ["friendly", 30], ["hostile", 25]],
    remain_hidden:           [["hostile", 50], ["neutral", 50]],
  },
  mysterious: {
    observe:                 [["curious", 60], ["neutral", 30], ["friendly", 10]],
    initiate_communication:  [["curious", 55], ["neutral", 25], ["friendly", 20]],
    send_diplomatic_envoy:   [["curious", 50], ["neutral", 30], ["friendly", 20]],
    remain_hidden:           [["curious", 65], ["neutral", 35]],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Select an outcome from a weighted pool using Math.random().
 *
 * @param {[string, number][]} pool  Array of [outcomeName, weight] pairs
 * @returns {string}
 */
function rollWeighted(pool) {
  const total = pool.reduce((sum, [, w]) => sum + w, 0);
  let roll    = Math.random() * total;
  for (const [outcome, weight] of pool) {
    roll -= weight;
    if (roll <= 0) return outcome;
  }
  return pool[pool.length - 1][0];
}

// ─── Outcome narrative ────────────────────────────────────────────────────────

/**
 * Build a human-readable outcome narrative based on species, action, and result.
 *
 * @param {string} speciesName
 * @param {string} action
 * @param {string} outcome
 * @param {string} civilizationLevel
 * @returns {string}
 */
function buildNarrative(speciesName, action, outcome, civilizationLevel) {
  const actionLabel = {
    observe:                "passive observation",
    initiate_communication: "opening hailing frequencies",
    send_diplomatic_envoy:  "dispatching a diplomatic team",
    remain_hidden:          "maintaining sensor silence",
  }[action] ?? action;

  const outcomeLabel = {
    friendly:  "responded with open and friendly overtures",
    fearful:   "reacted with alarm and withdrew from contact",
    hostile:   "responded with hostile intent — shields raised, weapons charged",
    curious:   "responded with cautious scientific curiosity",
    neutral:   "acknowledged the encounter but took no further action",
  }[outcome] ?? outcome;

  return `Following ${actionLabel}, the ${speciesName} (${civilizationLevel.replace(/_/g, " ")}) ${outcomeLabel}.`;
}

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Compute the outcome of a first contact encounter.
 *
 * The result is probabilistic within trait-defined bounds — the same action
 * against the same species type will occasionally produce different results
 * to reflect individual civilization variation and situational factors.
 *
 * @param {object} civilization  From generateCivilization()
 * @param {string} civilization.primaryTrait   Dominant trait driving the reaction
 * @param {string} civilization.speciesName
 * @param {string} civilization.civilizationLevel
 * @param {string} captainAction   One of CAPTAIN_ACTIONS
 * @returns {{
 *   outcome:          string,
 *   diplomaticStatus: string,
 *   narrative:        string,
 * }}
 * @throws  Error with .status 400 for invalid inputs
 */
export function generateOutcome(civilization, captainAction) {
  if (!civilization || typeof civilization !== "object") {
    throw Object.assign(new Error("civilization is required."), { status: 400 });
  }
  if (!CAPTAIN_ACTIONS.includes(captainAction)) {
    throw Object.assign(
      new Error(`captainAction must be one of: ${CAPTAIN_ACTIONS.join(", ")}.`),
      { status: 400 },
    );
  }

  const trait = civilization.primaryTrait ?? "peaceful";

  // Fallback to peaceful matrix for any unknown trait
  const traitMatrix  = OUTCOME_MATRIX[trait] ?? OUTCOME_MATRIX.peaceful;
  const outcomePool  = traitMatrix[captainAction] ?? traitMatrix.observe;
  const outcome      = rollWeighted(outcomePool);
  const diplomaticStatus = DIPLOMATIC_STATUS_BY_OUTCOME[outcome] ?? "observation_only";

  const narrative = buildNarrative(
    civilization.speciesName,
    captainAction,
    outcome,
    civilization.civilizationLevel,
  );

  return { outcome, diplomaticStatus, narrative };
}
