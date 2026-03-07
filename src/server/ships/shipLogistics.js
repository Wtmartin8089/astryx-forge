/**
 * shipLogistics.js
 * Starfleet logistics engine — construction, assignment, refit, repair, decommission.
 *
 * Manages the full lifecycle of a starship from commissioning at a shipyard
 * through operational service and eventual decommission.
 *
 * Firestore collection: ships
 *   One document per vessel. shipId = Firestore auto-ID.
 *
 * ── Integration ────────────────────────────────────────────────────────────────
 *   Fleet command:   shipCommandEngine.reviewCommandRequest (captain assignment)
 *   Crew assignment: fleetEngine.assignToShip / relieveFromShip
 *   Ship state:      shipStateEngine.createShipState / updateShipState
 *   Time engine:     timeEngine.getCurrentStardate
 *
 * ── Lifecycle ──────────────────────────────────────────────────────────────────
 *   createShip → status: "available"
 *   assignShipToCaptain → status: "assigned"
 *   startRefit → status: "under_refit"
 *   completeRefit → status: "available" | "assigned"
 *   startRepair → status: "under_repair"
 *   completeRepair → status: "available" | "assigned"
 *   decommissionShip → status: "decommissioned"
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  limit,
} from "firebase/firestore";
import { getServerDb } from "../firebase/serverDb.js";
import { getCurrentStardate } from "../time/timeEngine.js";
import { ALL_SHIP_CLASSES } from "./shipCommandEngine.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Valid ship operational statuses. */
export const SHIP_STATUSES = [
  "available",       // commissioned, no assigned captain, ready for command
  "assigned",        // under active command
  "under_refit",     // in shipyard for scheduled upgrade
  "under_repair",    // docked for damage repair
  "decommissioned",  // permanently retired from service
];

/** Known Starfleet shipyards and starbases. */
export const SHIPYARDS = [
  "Utopia Planitia Fleet Yards",
  "San Francisco Fleet Yards",
  "Pathfinder Starbase Shipyard",
  "Antares Shipyards",
  "Beta Antares Ship Yards",
  "40 Eridani A Starfleet Construction Yards",
];

/** Statuses that allow a refit to begin. */
const REFIT_ALLOWED_FROM  = ["available", "assigned"];

/** Statuses that allow repair to begin. */
const REPAIR_ALLOWED_FROM = ["available", "assigned", "under_refit"];

/** Statuses that cannot be decommissioned (protect active/repair ships). */
const DECOMMISSION_BLOCKED = ["under_repair", "decommissioned"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function db() { return getServerDb(); }

async function safeStardate() {
  try { return await getCurrentStardate(); }
  catch { return 53100.0; }
}

function shipRef(shipId) { return doc(db(), "ships", shipId); }

async function fetchShip(shipId) {
  const snap = await getDoc(shipRef(shipId));
  if (!snap.exists()) throw Object.assign(new Error("Ship not found."), { status: 404 });
  return { id: snap.id, ...snap.data() };
}

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Commission a new starship from a shipyard.
 *
 * @param {object} params
 * @param {string}  params.shipName           e.g. "USS Farpoint"
 * @param {string}  params.registryNumber     e.g. "NCC-73515"
 * @param {string}  params.shipClass          One of ALL_SHIP_CLASSES
 * @param {string}  params.shipyard           One of SHIPYARDS
 * @param {string}  [params.campaignId]
 * @param {string}  [params.location]         Initial location (defaults to shipyard)
 * @returns {Promise<object>}  New ship document
 * @throws  Error with .status 400 | 409
 */
export async function createShip({ shipName, registryNumber, shipClass, shipyard, campaignId = null, location = null }) {
  if (!shipName        || typeof shipName        !== "string") throw Object.assign(new Error("shipName is required."),        { status: 400 });
  if (!registryNumber  || typeof registryNumber  !== "string") throw Object.assign(new Error("registryNumber is required."),  { status: 400 });
  if (!shipClass       || typeof shipClass       !== "string") throw Object.assign(new Error("shipClass is required."),       { status: 400 });
  if (!shipyard        || typeof shipyard        !== "string") throw Object.assign(new Error("shipyard is required."),        { status: 400 });

  if (!ALL_SHIP_CLASSES.includes(shipClass)) {
    throw Object.assign(
      new Error(`shipClass must be one of: ${ALL_SHIP_CLASSES.join(", ")}.`),
      { status: 400 },
    );
  }
  if (!SHIPYARDS.includes(shipyard)) {
    throw Object.assign(
      new Error(`shipyard must be one of: ${SHIPYARDS.join(", ")}.`),
      { status: 400 },
    );
  }

  // Registry numbers must be unique within a campaign
  const dupQuery = await getDocs(
    query(
      collection(db(), "ships"),
      where("registryNumber", "==", registryNumber.trim()),
      ...(campaignId ? [where("campaignId", "==", campaignId)] : []),
      limit(1),
    ),
  );
  if (!dupQuery.empty) {
    throw Object.assign(
      new Error(`Registry number ${registryNumber} is already in use.`),
      { status: 409 },
    );
  }

  const stardate = await safeStardate();
  const now      = new Date().toISOString();

  const ship = {
    shipName:           shipName.trim(),
    registryNumber:     registryNumber.trim().toUpperCase(),
    shipClass,
    shipyard,
    status:             "available",
    location:           location ?? shipyard,
    campaignId,
    assignedCaptain:    null,
    commissionStardate: parseFloat(stardate.toFixed(1)),
    // Refit / repair tracking
    refitStartStardate: null,
    refitDuration:      null,
    refitCompletesAt:   null,
    repairStartStardate: null,
    repairDuration:     null,
    repairCompletesAt:  null,
    repairFacility:     null,
    // Decommission
    decommissionStardate: null,
    decommissionReason:   null,
    createdAt:          now,
    updatedAt:          now,
  };

  const ref = await addDoc(collection(db(), "ships"), ship);
  return { id: ref.id, ...ship };
}

/**
 * Assign a ship to a captain.
 * Called automatically by shipCommandEngine.reviewCommandRequest on approval,
 * or manually by Fleet Command for direct assignment.
 *
 * @param {string} shipId
 * @param {string} captainPlayerId
 * @param {number} [stardate]
 * @returns {Promise<object>}  Updated ship
 * @throws  Error with .status 404 | 409
 */
export async function assignShipToCaptain(shipId, captainPlayerId, stardate = null) {
  if (!shipId          || typeof shipId          !== "string") throw Object.assign(new Error("shipId is required."),          { status: 400 });
  if (!captainPlayerId || typeof captainPlayerId !== "string") throw Object.assign(new Error("captainPlayerId is required."), { status: 400 });

  const ship = await fetchShip(shipId);

  if (ship.status === "under_refit" || ship.status === "under_repair") {
    throw Object.assign(new Error(`Cannot assign captain — ship is currently ${ship.status}.`), { status: 409 });
  }
  if (ship.status === "decommissioned") {
    throw Object.assign(new Error("Cannot assign captain to a decommissioned ship."), { status: 409 });
  }

  const sd  = stardate ?? await safeStardate();
  const now = new Date().toISOString();

  const patch = {
    assignedCaptain: captainPlayerId,
    status:          "assigned",
    updatedAt:       now,
  };

  await updateDoc(shipRef(shipId), patch);
  return { ...ship, ...patch };
}

/**
 * Get a ship document by ID.
 *
 * @param {string} shipId
 * @returns {Promise<object>}
 */
export async function getShip(shipId) {
  if (!shipId || typeof shipId !== "string") throw Object.assign(new Error("shipId is required."), { status: 400 });
  return fetchShip(shipId);
}

/**
 * List ships, optionally filtered by status or campaign.
 *
 * @param {object} [filters]
 * @param {string}  [filters.status]
 * @param {string}  [filters.campaignId]
 * @param {string}  [filters.shipClass]
 * @returns {Promise<object[]>}
 */
export async function listShips({ status, campaignId, shipClass } = {}) {
  const constraints = [];
  if (status)     constraints.push(where("status",     "==", status));
  if (campaignId) constraints.push(where("campaignId", "==", campaignId));
  if (shipClass)  constraints.push(where("shipClass",  "==", shipClass));

  const snap = await getDocs(query(collection(db(), "ships"), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Send a ship into refit at a shipyard.
 *
 * @param {object} params
 * @param {string}  params.shipId
 * @param {number}  params.refitDuration   Duration in stardate units
 * @param {string}  [params.facility]      Shipyard performing the refit
 * @param {string}  [params.reason]        Brief refit description
 * @returns {Promise<object>}  Updated ship
 * @throws  Error with .status 400 | 404 | 409
 */
export async function startRefit({ shipId, refitDuration, facility = null, reason = null }) {
  if (!shipId || typeof shipId !== "string") throw Object.assign(new Error("shipId is required."), { status: 400 });
  if (typeof refitDuration !== "number" || refitDuration <= 0) throw Object.assign(new Error("refitDuration must be a positive number."), { status: 400 });

  const ship = await fetchShip(shipId);

  if (!REFIT_ALLOWED_FROM.includes(ship.status)) {
    throw Object.assign(
      new Error(`Cannot start refit — ship is currently ${ship.status}.`),
      { status: 409 },
    );
  }

  const stardate = await safeStardate();
  const now      = new Date().toISOString();
  const completesAt = parseFloat((stardate + refitDuration).toFixed(1));

  const patch = {
    status:             "under_refit",
    location:           facility ?? ship.location,
    refitStartStardate: parseFloat(stardate.toFixed(1)),
    refitDuration,
    refitCompletesAt:   completesAt,
    refitReason:        reason?.trim() ?? null,
    updatedAt:          now,
  };

  await updateDoc(shipRef(shipId), patch);
  return { ...ship, ...patch };
}

/**
 * Mark a refit as complete and return the ship to service.
 *
 * @param {string} shipId
 * @param {string} [newLocation]   Location after refit (defaults to refit facility)
 * @returns {Promise<object>}  Updated ship
 * @throws  Error with .status 404 | 409
 */
export async function completeRefit(shipId, newLocation = null) {
  if (!shipId || typeof shipId !== "string") throw Object.assign(new Error("shipId is required."), { status: 400 });

  const ship = await fetchShip(shipId);

  if (ship.status !== "under_refit") {
    throw Object.assign(new Error(`Ship is not under refit (current status: ${ship.status}).`), { status: 409 });
  }

  const now = new Date().toISOString();
  const restoredStatus = ship.assignedCaptain ? "assigned" : "available";

  const patch = {
    status:             restoredStatus,
    location:           newLocation ?? ship.location,
    refitStartStardate: null,
    refitDuration:      null,
    refitCompletesAt:   null,
    refitReason:        null,
    updatedAt:          now,
  };

  await updateDoc(shipRef(shipId), patch);
  return { ...ship, ...patch };
}

/**
 * Send a damaged ship to a starbase for repair.
 *
 * @param {object} params
 * @param {string}  params.shipId
 * @param {string}  params.repairFacility   Starbase or shipyard name
 * @param {number}  params.repairDuration   Duration in stardate units
 * @param {string}  [params.damageReport]   Description of damage being repaired
 * @returns {Promise<object>}  Updated ship
 * @throws  Error with .status 400 | 404 | 409
 */
export async function startRepair({ shipId, repairFacility, repairDuration, damageReport = null }) {
  if (!shipId         || typeof shipId         !== "string") throw Object.assign(new Error("shipId is required."),         { status: 400 });
  if (!repairFacility || typeof repairFacility !== "string") throw Object.assign(new Error("repairFacility is required."), { status: 400 });
  if (typeof repairDuration !== "number" || repairDuration <= 0) throw Object.assign(new Error("repairDuration must be a positive number."), { status: 400 });

  const ship = await fetchShip(shipId);

  if (!REPAIR_ALLOWED_FROM.includes(ship.status)) {
    throw Object.assign(
      new Error(`Cannot start repair — ship is currently ${ship.status}.`),
      { status: 409 },
    );
  }

  const stardate    = await safeStardate();
  const now         = new Date().toISOString();
  const completesAt = parseFloat((stardate + repairDuration).toFixed(1));

  const patch = {
    status:              "under_repair",
    location:            repairFacility,
    repairFacility,
    repairStartStardate: parseFloat(stardate.toFixed(1)),
    repairDuration,
    repairCompletesAt:   completesAt,
    damageReport:        damageReport?.trim() ?? null,
    updatedAt:           now,
  };

  await updateDoc(shipRef(shipId), patch);
  return { ...ship, ...patch };
}

/**
 * Complete repairs and return the ship to service.
 *
 * @param {string} shipId
 * @param {string} [newLocation]
 * @returns {Promise<object>}  Updated ship
 */
export async function completeRepair(shipId, newLocation = null) {
  if (!shipId || typeof shipId !== "string") throw Object.assign(new Error("shipId is required."), { status: 400 });

  const ship = await fetchShip(shipId);

  if (ship.status !== "under_repair") {
    throw Object.assign(new Error(`Ship is not under repair (current status: ${ship.status}).`), { status: 409 });
  }

  const now            = new Date().toISOString();
  const restoredStatus = ship.assignedCaptain ? "assigned" : "available";

  const patch = {
    status:              restoredStatus,
    location:            newLocation ?? ship.repairFacility ?? ship.location,
    repairFacility:      null,
    repairStartStardate: null,
    repairDuration:      null,
    repairCompletesAt:   null,
    damageReport:        null,
    updatedAt:           now,
  };

  await updateDoc(shipRef(shipId), patch);
  return { ...ship, ...patch };
}

/**
 * Decommission a ship permanently.
 *
 * Cannot decommission a ship under repair (resolve the repair first).
 * Cannot decommission an already-decommissioned ship.
 *
 * @param {string} shipId
 * @param {string} [reason]  Reason for decommission
 * @returns {Promise<object>}  Final ship record
 * @throws  Error with .status 400 | 404 | 409
 */
export async function decommissionShip(shipId, reason = null) {
  if (!shipId || typeof shipId !== "string") throw Object.assign(new Error("shipId is required."), { status: 400 });

  const ship = await fetchShip(shipId);

  if (DECOMMISSION_BLOCKED.includes(ship.status)) {
    throw Object.assign(
      new Error(`Cannot decommission — ship is currently ${ship.status}. Resolve this before decommissioning.`),
      { status: 409 },
    );
  }

  const stardate = await safeStardate();
  const now      = new Date().toISOString();

  const patch = {
    status:                "decommissioned",
    assignedCaptain:       null,
    decommissionStardate:  parseFloat(stardate.toFixed(1)),
    decommissionReason:    reason?.trim() ?? null,
    updatedAt:             now,
  };

  await updateDoc(shipRef(shipId), patch);
  return { ...ship, ...patch };
}
