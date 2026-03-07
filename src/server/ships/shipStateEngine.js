/**
 * shipStateEngine.js
 * Centralized state system for starship operational condition.
 *
 * Manages the full operational profile of a ship — subsystems, shields,
 * power allocation, hull integrity, and alert level.
 *
 * Firestore collection: shipStates  (one document per ship, keyed by shipId)
 *
 * Integration — import and call from:
 *   - combat system   → shield/hull damage, alert level changes
 *   - warp engine     → warpDrive status check, powerEngines allocation
 *   - sensor system   → sensors subsystem status, powerSensors level
 *   - damage system   → subsystem status transitions (operational → damaged → offline)
 *   - inventory       → repair events, power cell consumption
 *
 * Usage:
 *   import { createShipState, getShipState, updateShipState } from "../ships/shipStateEngine.js";
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getServerDb } from "../firebase/serverDb.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Valid operational states for any subsystem. */
export const SUBSYSTEM_STATUS = {
  OPERATIONAL: "operational",
  DAMAGED:     "damaged",
  OFFLINE:     "offline",
};

/** Valid ship-wide alert levels. */
export const ALERT_LEVELS = {
  GREEN:  "green",   // normal operations
  YELLOW: "yellow",  // elevated readiness
  RED:    "red",     // battle stations
  BLACK:  "black",   // silent running
};

// ─── Subsystem registry ───────────────────────────────────────────────────────

/**
 * All trackable subsystems and their default operational states.
 * Any subsystem not listed here will be rejected by updateShipState.
 */
const SUBSYSTEM_DEFAULTS = {
  warpDrive:           "operational",
  impulseEngines:      "operational",
  shields:             "operational",
  phasers:             "operational",
  torpedoes:           "operational",
  sensors:             "operational",
  lifeSupport:         "operational",
  computerCore:        "operational",
  structuralIntegrity: "operational",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function db() {
  return getServerDb();
}

/** Firestore document reference for a ship's state, keyed by shipId. */
function shipStateRef(shipId) {
  return doc(db(), "shipStates", shipId);
}

/** Clamp a value to the range [0, 100]. */
function clamp(v) {
  return Math.max(0, Math.min(100, v));
}

function isValidSubsystemStatus(v) {
  return v === "operational" || v === "damaged" || v === "offline";
}

function isValidAlertLevel(v) {
  return v === "green" || v === "yellow" || v === "red" || v === "black";
}

/**
 * Safely parse stateJson back to a subsystem map.
 * Falls back to defaults if the field is missing or malformed.
 *
 * @param {string|null} stateJson
 * @returns {object}  subsystems map
 */
function parseSubsystems(stateJson) {
  try {
    const parsed = JSON.parse(stateJson ?? "{}");
    return parsed.subsystems ?? { ...SUBSYSTEM_DEFAULTS };
  } catch {
    return { ...SUBSYSTEM_DEFAULTS };
  }
}

// ─── Default state factory ────────────────────────────────────────────────────

/**
 * Build a fresh ship state document with all systems at full operational status.
 *
 * Top-level scalar fields are queryable / indexed.
 * stateJson is a JSON string holding the full subsystem detail for external
 * module consumption and audit logging.
 *
 * Power allocation defaults (percent points):
 *   engines 25 | weapons 20 | shields 25 | sensors 15 | reserve 15
 *
 * @param {string} shipId
 * @returns {object}
 */
function defaultShipState(shipId) {
  const subsystems = { ...SUBSYSTEM_DEFAULTS };

  return {
    shipId,

    // Stardate of the last meaningful state change (set by callers)
    stardate: null,

    // Warp drive status (top-level, queryable — mirrors subsystems.warpDrive)
    warpStatus: "operational",

    // Shield strength — percent of maximum emitter output
    shieldFore: 100,
    shieldAft:  100,

    // Hull structural integrity — percent
    hullIntegrity: 100,

    // Power allocation — percent points drawn from total power grid
    powerEngines: 25,
    powerWeapons: 20,
    powerShields: 25,
    powerSensors: 15,

    // Ship-wide alert posture
    alertLevel: "green",

    // Full subsystem detail — serialized for portability across modules
    stateJson: JSON.stringify({ subsystems }),

    lastUpdatedAt: null,
    createdAt:     null,
  };
}

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Create a default ship state document in Firestore.
 *
 * Idempotent: if a state already exists for the ship, returns it unchanged.
 * This mirrors the loadOrGenerateSector pattern — callers never need to guard
 * against duplicate initialization.
 *
 * @param {string} shipId
 * @returns {Promise<{ created: boolean, state: object }>}
 * @throws  Error with .status 400 for invalid input
 */
export async function createShipState(shipId) {
  if (!shipId || typeof shipId !== "string") {
    throw Object.assign(new Error("shipId is required."), { status: 400 });
  }

  const ref  = shipStateRef(shipId);
  const snap = await getDoc(ref);

  // Already exists — return current state without overwriting
  if (snap.exists()) {
    return { created: false, state: { id: snap.id, ...snap.data() } };
  }

  const now   = new Date().toISOString();
  const state = {
    ...defaultShipState(shipId),
    createdAt:     now,
    lastUpdatedAt: now,
  };

  await setDoc(ref, state);
  return { created: true, state: { id: shipId, ...state } };
}

/**
 * Retrieve the current operational state for a ship.
 *
 * @param {string} shipId
 * @returns {Promise<object>}  Full ship state document (includes id)
 * @throws  Error with .status 404 if no state exists for the ship
 */
export async function getShipState(shipId) {
  if (!shipId || typeof shipId !== "string") {
    throw Object.assign(new Error("shipId is required."), { status: 400 });
  }

  const snap = await getDoc(shipStateRef(shipId));

  if (!snap.exists()) {
    throw Object.assign(
      new Error(`No ship state found for ship "${shipId}". Call createShipState first.`),
      { status: 404 },
    );
  }

  return { id: snap.id, ...snap.data() };
}

/**
 * Apply a partial update to a ship's operational state.
 *
 * All fields are optional — only the provided keys are changed.
 * Numeric fields (shields, hull, power) are clamped to [0, 100].
 * Subsystem changes are merged into the existing subsystem map and
 * stateJson is recomputed automatically so it always reflects current reality.
 *
 * Accepted changes:
 *
 *   Scalar:
 *     warpStatus     "operational" | "damaged" | "offline"
 *     shieldFore     0–100
 *     shieldAft      0–100
 *     hullIntegrity  0–100
 *     powerEngines   0–100
 *     powerWeapons   0–100
 *     powerShields   0–100
 *     powerSensors   0–100
 *     alertLevel     "green" | "yellow" | "red" | "black"
 *     stardate       string (caller-provided stardate notation)
 *
 *   Subsystems (nested object, merged with current state):
 *     subsystems: {
 *       warpDrive?:           "operational" | "damaged" | "offline"
 *       impulseEngines?:      "operational" | "damaged" | "offline"
 *       shields?:             "operational" | "damaged" | "offline"
 *       phasers?:             "operational" | "damaged" | "offline"
 *       torpedoes?:           "operational" | "damaged" | "offline"
 *       sensors?:             "operational" | "damaged" | "offline"
 *       lifeSupport?:         "operational" | "damaged" | "offline"
 *       computerCore?:        "operational" | "damaged" | "offline"
 *       structuralIntegrity?: "operational" | "damaged" | "offline"
 *     }
 *
 * @param {string} shipId
 * @param {object} changes
 * @returns {Promise<object>}  Full updated state document (includes id)
 * @throws  Error with .status 400 | 404
 */
export async function updateShipState(shipId, changes) {
  if (!shipId || typeof shipId !== "string") {
    throw Object.assign(new Error("shipId is required."), { status: 400 });
  }
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    throw Object.assign(new Error("changes must be a plain object."), { status: 400 });
  }

  const ref  = shipStateRef(shipId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw Object.assign(
      new Error(`No ship state found for ship "${shipId}". Call createShipState first.`),
      { status: 404 },
    );
  }

  const current = snap.data();
  const patch   = { lastUpdatedAt: new Date().toISOString() };

  // ── Numeric fields — clamped to [0, 100] ──────────────────────────────────
  const numericFields = [
    "shieldFore",
    "shieldAft",
    "hullIntegrity",
    "powerEngines",
    "powerWeapons",
    "powerShields",
    "powerSensors",
  ];

  for (const field of numericFields) {
    if (field in changes) {
      const v = Number(changes[field]);
      if (isNaN(v)) {
        throw Object.assign(
          new Error(`${field} must be a number.`),
          { status: 400 },
        );
      }
      patch[field] = clamp(v);
    }
  }

  // ── warpStatus ─────────────────────────────────────────────────────────────
  if ("warpStatus" in changes) {
    if (!isValidSubsystemStatus(changes.warpStatus)) {
      throw Object.assign(
        new Error("warpStatus must be 'operational', 'damaged', or 'offline'."),
        { status: 400 },
      );
    }
    patch.warpStatus = changes.warpStatus;
  }

  // ── alertLevel ─────────────────────────────────────────────────────────────
  if ("alertLevel" in changes) {
    if (!isValidAlertLevel(changes.alertLevel)) {
      throw Object.assign(
        new Error("alertLevel must be 'green', 'yellow', 'red', or 'black'."),
        { status: 400 },
      );
    }
    patch.alertLevel = changes.alertLevel;
  }

  // ── stardate ───────────────────────────────────────────────────────────────
  if ("stardate" in changes) {
    patch.stardate = changes.stardate;
  }

  // ── Subsystems — merge into current stateJson ──────────────────────────────
  const incomingSubsystems = changes.subsystems ?? {};
  const currentSubsystems  = parseSubsystems(current.stateJson);
  const mergedSubsystems   = { ...currentSubsystems };

  for (const [key, status] of Object.entries(incomingSubsystems)) {
    if (!(key in SUBSYSTEM_DEFAULTS)) {
      throw Object.assign(
        new Error(`Unknown subsystem: "${key}". Valid keys: ${Object.keys(SUBSYSTEM_DEFAULTS).join(", ")}.`),
        { status: 400 },
      );
    }
    if (!isValidSubsystemStatus(status)) {
      throw Object.assign(
        new Error(`subsystems.${key}: must be 'operational', 'damaged', or 'offline'.`),
        { status: 400 },
      );
    }
    mergedSubsystems[key] = status;
  }

  // Always reserialize — keeps stateJson in sync even if only scalars changed
  patch.stateJson = JSON.stringify({ subsystems: mergedSubsystems });

  await updateDoc(ref, patch);

  return { id: shipId, ...current, ...patch };
}
