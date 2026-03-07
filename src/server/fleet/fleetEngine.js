/**
 * fleetEngine.js
 * Core engine for the Starfleet Command hierarchy.
 *
 * Manages the full command structure: fleet commands, task forces, crew
 * assignments, player ranks, promotion records, and fleet orders.
 *
 * Firestore collections:
 *   fleetCommands      Top-level fleet organizations
 *   taskForces         Task forces assigned under a fleet command
 *   crewAssignments    Operational player→ship assignment (role + rank)
 *   playerRanks        Current rank for each player (keyed by playerId)
 *   promotionRecords   Immutable audit trail of all rank changes
 *   fleetOrders        Orders issued to task forces
 *
 * Note on existing data:
 *   The `crew` collection (managed by crewFirestore.ts) stores character
 *   sheets — name, species, attributes. crewAssignments is the operational
 *   layer: which ship a player is assigned to, their role, and their rank.
 *   Both collections reference each other by playerId / crewId.
 *
 * ── Integration ────────────────────────────────────────────────────────────────
 *   import { assignToShip, getCurrentRank, issueFleetOrder } from "../fleet/fleetEngine.js";
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { getServerDb } from "../firebase/serverDb.js";

// ─── Rank system ──────────────────────────────────────────────────────────────

/** Ordered rank list — index = numeric rank value (0 = lowest). */
export const RANKS = [
  "Cadet",
  "Ensign",
  "Lieutenant Junior Grade",
  "Lieutenant",
  "Lieutenant Commander",
  "Commander",
  "Captain",
  "Commodore",
  "Rear Admiral",
  "Vice Admiral",
  "Admiral",
];

/** Map rank name → numeric index for comparison. */
export const RANK_INDEX = Object.fromEntries(RANKS.map((r, i) => [r, i]));

/** Minimum rank required per role (advisory — can be overridden with force flag). */
export const ROLE_MIN_RANK = {
  "Captain":                "Commander",
  "Executive Officer":      "Lieutenant Commander",
  "Chief Engineer":         "Lieutenant",
  "Chief Science Officer":  "Lieutenant",
  "Chief Tactical Officer": "Lieutenant",
  "Helm Officer":           "Ensign",
  "Medical Officer":        "Lieutenant",
};

// ─── Crew roles ───────────────────────────────────────────────────────────────

export const CREW_ROLES = Object.keys(ROLE_MIN_RANK);

// ─── Order statuses ───────────────────────────────────────────────────────────

export const ORDER_STATUSES = ["pending", "active", "completed", "rescinded"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function db() { return getServerDb(); }

function isValidRank(r) { return RANKS.includes(r); }
function isValidRole(r) { return CREW_ROLES.includes(r); }

/**
 * Return true if rankA is at least as senior as rankB.
 * @param {string} rankA
 * @param {string} rankB
 * @returns {boolean}
 */
export function rankAtLeast(rankA, rankB) {
  return (RANK_INDEX[rankA] ?? -1) >= (RANK_INDEX[rankB] ?? 0);
}

// ─── Fleet Command ────────────────────────────────────────────────────────────

/**
 * Create a new fleet command organization.
 *
 * @param {object} params
 * @param {string}  params.name          e.g. "Seventh Fleet"
 * @param {string}  params.commandingOfficer  playerId of the admiral in command
 * @param {string}  [params.homeStarbase]     Primary base of operations
 * @param {string}  [params.campaignId]
 * @returns {Promise<object>}
 */
export async function createFleetCommand({ name, commandingOfficer, homeStarbase = null, campaignId = null }) {
  if (!name              || typeof name              !== "string") throw Object.assign(new Error("name is required."),              { status: 400 });
  if (!commandingOfficer || typeof commandingOfficer !== "string") throw Object.assign(new Error("commandingOfficer is required."), { status: 400 });

  const now = new Date().toISOString();
  const ref = await addDoc(collection(db(), "fleetCommands"), {
    name: name.trim(),
    commandingOfficer,
    homeStarbase,
    campaignId,
    taskForceIds: [],
    createdAt:    now,
  });
  return { id: ref.id, name, commandingOfficer, homeStarbase, campaignId, taskForceIds: [], createdAt: now };
}

/**
 * Get a fleet command and all its task forces.
 *
 * @param {string} fleetId
 * @returns {Promise<{ fleet: object, taskForces: object[] }>}
 */
export async function getFleetCommand(fleetId) {
  if (!fleetId || typeof fleetId !== "string") throw Object.assign(new Error("fleetId is required."), { status: 400 });

  const snap = await getDoc(doc(db(), "fleetCommands", fleetId));
  if (!snap.exists()) throw Object.assign(new Error("Fleet command not found."), { status: 404 });

  const fleet = { id: snap.id, ...snap.data() };

  const tfSnap = await getDocs(
    query(collection(db(), "taskForces"), where("fleetId", "==", fleetId)),
  );
  const taskForces = tfSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return { fleet, taskForces };
}

// ─── Task Forces ──────────────────────────────────────────────────────────────

/**
 * Create a task force under a fleet command.
 *
 * @param {object} params
 * @param {string}  params.fleetId          Parent fleet command ID
 * @param {string}  params.taskForceName
 * @param {string}  params.mission          Mission brief
 * @param {string}  [params.starbase]       Assigned starbase
 * @param {string[]} [params.assignedShips] Initial ship IDs
 * @param {string}  [params.campaignId]
 * @returns {Promise<object>}
 */
export async function createTaskForce({
  fleetId,
  taskForceName,
  mission,
  starbase      = null,
  assignedShips = [],
  campaignId    = null,
}) {
  if (!fleetId       || typeof fleetId       !== "string") throw Object.assign(new Error("fleetId is required."),       { status: 400 });
  if (!taskForceName || typeof taskForceName !== "string") throw Object.assign(new Error("taskForceName is required."), { status: 400 });
  if (!mission       || typeof mission       !== "string") throw Object.assign(new Error("mission is required."),       { status: 400 });

  // Verify fleet exists
  const fleetSnap = await getDoc(doc(db(), "fleetCommands", fleetId));
  if (!fleetSnap.exists()) throw Object.assign(new Error("Fleet command not found."), { status: 404 });

  const now = new Date().toISOString();
  const ref = await addDoc(collection(db(), "taskForces"), {
    fleetId,
    taskForceName: taskForceName.trim(),
    mission:       mission.trim(),
    starbase,
    assignedShips: Array.isArray(assignedShips) ? assignedShips : [],
    campaignId,
    status:        "active",
    createdAt:     now,
  });

  // Add task force ID to fleet's list
  await updateDoc(doc(db(), "fleetCommands", fleetId), {
    taskForceIds: [...(fleetSnap.data().taskForceIds ?? []), ref.id],
  });

  return { id: ref.id, fleetId, taskForceName, mission, starbase, assignedShips, campaignId, status: "active", createdAt: now };
}

/**
 * Assign a ship to a task force.
 *
 * @param {string} taskForceId
 * @param {string} shipId
 * @returns {Promise<object>}  Updated task force
 */
export async function assignShipToTaskForce(taskForceId, shipId) {
  if (!taskForceId || typeof taskForceId !== "string") throw Object.assign(new Error("taskForceId is required."), { status: 400 });
  if (!shipId      || typeof shipId      !== "string") throw Object.assign(new Error("shipId is required."),      { status: 400 });

  const ref  = doc(db(), "taskForces", taskForceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw Object.assign(new Error("Task force not found."), { status: 404 });

  const current = snap.data().assignedShips ?? [];
  if (current.includes(shipId)) return { id: snap.id, ...snap.data() }; // idempotent

  const updated = [...current, shipId];
  await updateDoc(ref, { assignedShips: updated });
  return { id: snap.id, ...snap.data(), assignedShips: updated };
}

// ─── Crew Assignments ─────────────────────────────────────────────────────────

/**
 * Assign a player to a ship with a role and rank.
 *
 * If the player already has an assignment on this ship, it is updated.
 * Each player can only hold one role per ship at a time.
 *
 * @param {object} params
 * @param {string}  params.playerId
 * @param {string}  params.shipId
 * @param {string}  params.role       One of CREW_ROLES
 * @param {string}  params.rank       One of RANKS
 * @param {string}  [params.campaignId]
 * @param {boolean} [params.force]    Skip rank-role minimum check if true
 * @returns {Promise<object>}  The crew assignment document
 * @throws  Error with .status 400 | 409
 */
export async function assignToShip({ playerId, shipId, role, rank, campaignId = null, force = false }) {
  if (!playerId || typeof playerId !== "string") throw Object.assign(new Error("playerId is required."), { status: 400 });
  if (!shipId   || typeof shipId   !== "string") throw Object.assign(new Error("shipId is required."),   { status: 400 });
  if (!isValidRole(role))  throw Object.assign(new Error(`role must be one of: ${CREW_ROLES.join(", ")}.`), { status: 400 });
  if (!isValidRank(rank))  throw Object.assign(new Error(`rank must be one of: ${RANKS.join(", ")}.`),     { status: 400 });

  // Rank-role advisory check
  if (!force) {
    const minRank = ROLE_MIN_RANK[role];
    if (minRank && !rankAtLeast(rank, minRank)) {
      throw Object.assign(
        new Error(`${role} requires minimum rank of ${minRank}. Current rank: ${rank}. Pass force=true to override.`),
        { status: 400 },
      );
    }
  }

  // Captain role: only one captain per ship
  if (role === "Captain") {
    const captainSnap = await getDocs(
      query(
        collection(db(), "crewAssignments"),
        where("shipId", "==", shipId),
        where("role",   "==", "Captain"),
        limit(1),
      ),
    );
    if (!captainSnap.empty && captainSnap.docs[0].data().playerId !== playerId) {
      throw Object.assign(
        new Error("This ship already has a Captain assigned. Relieve the current captain before assigning a new one."),
        { status: 409 },
      );
    }
  }

  const now = new Date().toISOString();
  // Upsert by fixed doc ID to ensure one assignment per player per ship
  const assignmentId = `${playerId}__${shipId}`;
  const assignmentRef = doc(db(), "crewAssignments", assignmentId);
  const existing = await getDoc(assignmentRef);

  const data = {
    playerId,
    shipId,
    role,
    rank,
    campaignId,
    assignedAt:  now,
    updatedAt:   now,
  };

  if (existing.exists()) {
    await updateDoc(assignmentRef, { role, rank, updatedAt: now });
  } else {
    await setDoc(assignmentRef, data);
  }

  return { id: assignmentId, ...data };
}

/**
 * Get all crew assignments for a ship.
 *
 * @param {string} shipId
 * @returns {Promise<object[]>}
 */
export async function getShipCrew(shipId) {
  if (!shipId || typeof shipId !== "string") throw Object.assign(new Error("shipId is required."), { status: 400 });

  const snap = await getDocs(
    query(collection(db(), "crewAssignments"), where("shipId", "==", shipId)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Remove a crew assignment (relieve from duty on a ship).
 *
 * @param {string} playerId
 * @param {string} shipId
 * @returns {Promise<void>}
 */
export async function relieveFromShip(playerId, shipId) {
  if (!playerId || typeof playerId !== "string") throw Object.assign(new Error("playerId is required."), { status: 400 });
  if (!shipId   || typeof shipId   !== "string") throw Object.assign(new Error("shipId is required."),   { status: 400 });

  const ref  = doc(db(), "crewAssignments", `${playerId}__${shipId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw Object.assign(new Error("No assignment found for this player on this ship."), { status: 404 });

  // Soft-delete: mark as relieved rather than deleting, to preserve history
  await updateDoc(ref, { status: "relieved", relievedAt: new Date().toISOString() });
}

// ─── Player Ranks ─────────────────────────────────────────────────────────────

/**
 * Get the current Starfleet rank for a player.
 * Returns "Cadet" if the player has no rank record yet.
 *
 * @param {string} playerId
 * @returns {Promise<string>}  Current rank name
 */
export async function getCurrentRank(playerId) {
  if (!playerId || typeof playerId !== "string") throw Object.assign(new Error("playerId is required."), { status: 400 });

  const snap = await getDoc(doc(db(), "playerRanks", playerId));
  return snap.exists() ? snap.data().rank : "Cadet";
}

/**
 * Set a player's current rank directly (used by promotePlayer and initial assignment).
 * This is the single source of truth for a player's rank — all reads should use getCurrentRank().
 *
 * @param {string} playerId
 * @param {string} rank
 * @returns {Promise<void>}
 */
export async function setCurrentRank(playerId, rank) {
  if (!isValidRank(rank)) throw Object.assign(new Error(`Invalid rank: ${rank}.`), { status: 400 });
  await setDoc(doc(db(), "playerRanks", playerId), {
    rank,
    updatedAt: new Date().toISOString(),
  });
}

// ─── Promotion Records ────────────────────────────────────────────────────────

/**
 * Write an immutable promotion record to the audit trail.
 * Called by promotePlayer — do not call directly.
 *
 * @param {object} params
 * @returns {Promise<object>}
 */
export async function writePromotionRecord({ playerId, oldRank, newRank, stardate, approvedBy, campaignId = null }) {
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db(), "promotionRecords"), {
    playerId,
    oldRank,
    newRank,
    stardate: parseFloat(stardate.toFixed(1)),
    approvedBy,
    campaignId,
    createdAt: now,
  });
  return { id: ref.id, playerId, oldRank, newRank, stardate, approvedBy, campaignId, createdAt: now };
}

/**
 * Get promotion history for a player, newest first.
 *
 * @param {string} playerId
 * @returns {Promise<object[]>}
 */
export async function getPromotionHistory(playerId) {
  if (!playerId || typeof playerId !== "string") throw Object.assign(new Error("playerId is required."), { status: 400 });

  const snap = await getDocs(
    query(
      collection(db(), "promotionRecords"),
      where("playerId", "==", playerId),
      orderBy("stardate", "desc"),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Fleet Orders ─────────────────────────────────────────────────────────────

/**
 * Issue a fleet order to a task force.
 *
 * @param {object} params
 * @param {string}  params.orderTitle
 * @param {string}  params.description
 * @param {string}  params.assignedTaskForce  Task force ID
 * @param {number}  params.stardate
 * @param {string}  [params.issuedBy]         Player/officer ID who issued the order
 * @param {string}  [params.campaignId]
 * @returns {Promise<object>}
 */
export async function issueFleetOrder({
  orderTitle,
  description,
  assignedTaskForce,
  stardate,
  issuedBy    = null,
  campaignId  = null,
}) {
  if (!orderTitle        || typeof orderTitle        !== "string") throw Object.assign(new Error("orderTitle is required."),        { status: 400 });
  if (!description       || typeof description       !== "string") throw Object.assign(new Error("description is required."),       { status: 400 });
  if (!assignedTaskForce || typeof assignedTaskForce !== "string") throw Object.assign(new Error("assignedTaskForce is required."), { status: 400 });
  if (typeof stardate !== "number" || isNaN(stardate))             throw Object.assign(new Error("stardate must be a number."),     { status: 400 });

  // Verify task force exists
  const tfSnap = await getDoc(doc(db(), "taskForces", assignedTaskForce));
  if (!tfSnap.exists()) throw Object.assign(new Error("Task force not found."), { status: 404 });

  const now = new Date().toISOString();
  const ref = await addDoc(collection(db(), "fleetOrders"), {
    orderTitle:        orderTitle.trim(),
    description:       description.trim(),
    assignedTaskForce,
    stardate:          parseFloat(stardate.toFixed(1)),
    issuedBy,
    campaignId,
    status:            "pending",
    createdAt:         now,
    updatedAt:         now,
  });

  return {
    id: ref.id,
    orderTitle,
    description,
    assignedTaskForce,
    stardate: parseFloat(stardate.toFixed(1)),
    issuedBy,
    campaignId,
    status: "pending",
    createdAt: now,
  };
}

/**
 * Update the status of a fleet order.
 *
 * @param {string} orderId
 * @param {string} status  One of ORDER_STATUSES
 * @returns {Promise<object>}
 */
export async function updateOrderStatus(orderId, status) {
  if (!orderId || typeof orderId !== "string") throw Object.assign(new Error("orderId is required."), { status: 400 });
  if (!ORDER_STATUSES.includes(status)) {
    throw Object.assign(
      new Error(`status must be one of: ${ORDER_STATUSES.join(", ")}.`),
      { status: 400 },
    );
  }

  const ref  = doc(db(), "fleetOrders", orderId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw Object.assign(new Error("Fleet order not found."), { status: 404 });

  await updateDoc(ref, { status, updatedAt: new Date().toISOString() });
  return { id: snap.id, ...snap.data(), status };
}
