/**
 * shipCommandEngine.js
 * Starship Command System — eligibility, request workflow, and crew management.
 *
 * A player who meets rank, XP, and mission requirements may submit a command
 * request. Fleet Command reviews and approves or denies it. On approval the
 * player becomes captain of the ship and the record is saved to shipCommands.
 *
 * Firestore collections:
 *   shipCommands        Active command assignments (one per ship)
 *   commandRequests     Pending/reviewed command requests
 *
 * ── Integration ────────────────────────────────────────────────────────────────
 *   Fleet rank system:   ../fleet/fleetEngine.js  (rankAtLeast, assignToShip)
 *   Task force system:   fleetEngine.createTaskForce / assignShipToTaskForce
 *   Time engine:         ../time/timeEngine.js     (getCurrentStardate)
 *
 * ── Command eligibility requirements ──────────────────────────────────────────
 *   Rank:               Commander or higher
 *   Minimum XP:         8 000
 *   Minimum missions:   15 completed
 *   Disciplinary:       no active warnings
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
  limit,
} from "firebase/firestore";
import { getServerDb } from "../firebase/serverDb.js";
import { rankAtLeast, assignToShip, getCurrentRank } from "../fleet/fleetEngine.js";
import { getCurrentStardate } from "../time/timeEngine.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum rank required to command a starship. */
export const COMMAND_MIN_RANK = "Commander";

/** Minimum XP to command a starship. */
export const COMMAND_MIN_XP = 8000;

/** Minimum completed missions to command a starship. */
export const COMMAND_MIN_MISSIONS = 15;

/** Ship tiers and their eligible classes. */
export const SHIP_TIERS = {
  1: ["Nova-class",     "Saber-class",    "Defiant-class"],
  2: ["Intrepid-class", "Akira-class",    "Nebula-class"],
  3: ["Galaxy-class",   "Sovereign-class","Prometheus-class"],
};

/** Flat map: shipClass → tier number. */
export const SHIP_CLASS_TIER = Object.fromEntries(
  Object.entries(SHIP_TIERS).flatMap(([tier, classes]) =>
    classes.map((c) => [c, Number(tier)]),
  ),
);

/** All valid ship classes across all tiers. */
export const ALL_SHIP_CLASSES = Object.values(SHIP_TIERS).flat();

/** Crew roles a captain may assign (excluding Captain itself). */
export const ASSIGNABLE_CREW_ROLES = [
  "Executive Officer",
  "Chief Engineer",
  "Chief Science Officer",
  "Chief Tactical Officer",
  "Helm Officer",
  "Medical Officer",
];

/** Command request lifecycle statuses. */
export const REQUEST_STATUSES = ["pending", "approved", "denied", "withdrawn"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function db() { return getServerDb(); }

async function safeStardate() {
  try { return await getCurrentStardate(); }
  catch { return 53100.0; }
}

// ─── Eligibility check ────────────────────────────────────────────────────────

/**
 * Check whether a player meets all command eligibility requirements.
 *
 * Does not write to Firestore — pure read and evaluation.
 *
 * Player profile fields read from `players/{playerId}`:
 *   xp                number
 *   missionsCompleted number
 *   disciplinaryWarnings number (0 = clean record)
 *
 * @param {string} playerId
 * @returns {Promise<{
 *   eligible:  boolean,
 *   rank:      string,
 *   reasons:   string[],   — reasons for ineligibility (empty if eligible)
 *   stats:     { rank, xp, missionsCompleted, disciplinaryWarnings }
 * }>}
 */
export async function checkCommandEligibility(playerId) {
  if (!playerId || typeof playerId !== "string") {
    throw Object.assign(new Error("playerId is required."), { status: 400 });
  }

  const [rankValue, playerSnap] = await Promise.all([
    getCurrentRank(playerId),
    getDoc(doc(db(), "players", playerId)),
  ]);

  const playerData = playerSnap.exists() ? playerSnap.data() : {};
  const xp                  = playerData.xp                   ?? 0;
  const missionsCompleted   = playerData.missionsCompleted     ?? 0;
  const disciplinaryWarnings = playerData.disciplinaryWarnings ?? 0;

  const reasons = [];

  if (!rankAtLeast(rankValue, COMMAND_MIN_RANK)) {
    reasons.push(`Rank must be ${COMMAND_MIN_RANK} or higher (current: ${rankValue}).`);
  }
  if (xp < COMMAND_MIN_XP) {
    reasons.push(`Minimum ${COMMAND_MIN_XP} XP required (current: ${xp}).`);
  }
  if (missionsCompleted < COMMAND_MIN_MISSIONS) {
    reasons.push(`Minimum ${COMMAND_MIN_MISSIONS} missions required (current: ${missionsCompleted}).`);
  }
  if (disciplinaryWarnings > 0) {
    reasons.push(`Active disciplinary warning(s) on record (${disciplinaryWarnings}). Must be resolved before command.`);
  }

  return {
    eligible: reasons.length === 0,
    rank:     rankValue,
    reasons,
    stats: { rank: rankValue, xp, missionsCompleted, disciplinaryWarnings },
  };
}

// ─── Command request ──────────────────────────────────────────────────────────

/**
 * Submit a command request on behalf of an eligible player.
 *
 * Runs a full eligibility check before creating the request.
 * Only one pending request per player is allowed at a time.
 *
 * @param {object} params
 * @param {string}  params.playerId
 * @param {string}  params.requestedShipClass  Must be one of ALL_SHIP_CLASSES
 * @param {string}  [params.campaignId]
 * @param {string}  [params.statement]         Player's command statement (optional)
 * @returns {Promise<{ request: object, eligibility: object }>}
 * @throws  Error with .status 400 | 403 | 409
 */
export async function submitCommandRequest({ playerId, requestedShipClass, campaignId = null, statement = null }) {
  if (!playerId           || typeof playerId           !== "string") throw Object.assign(new Error("playerId is required."),           { status: 400 });
  if (!requestedShipClass || typeof requestedShipClass !== "string") throw Object.assign(new Error("requestedShipClass is required."), { status: 400 });
  if (!ALL_SHIP_CLASSES.includes(requestedShipClass)) {
    throw Object.assign(
      new Error(`requestedShipClass must be one of: ${ALL_SHIP_CLASSES.join(", ")}.`),
      { status: 400 },
    );
  }

  // Eligibility check
  const eligibility = await checkCommandEligibility(playerId);
  if (!eligibility.eligible) {
    throw Object.assign(
      new Error(`Command eligibility requirements not met: ${eligibility.reasons.join(" | ")}`),
      { status: 403 },
    );
  }

  // One pending request per player
  const existing = await getDocs(
    query(
      collection(db(), "commandRequests"),
      where("playerId", "==", playerId),
      where("status",   "==", "pending"),
      limit(1),
    ),
  );
  if (!existing.empty) {
    throw Object.assign(
      new Error("Player already has a pending command request. Withdraw it before submitting a new one."),
      { status: 409 },
    );
  }

  const stardate = await safeStardate();
  const now      = new Date().toISOString();
  const tier     = SHIP_CLASS_TIER[requestedShipClass];

  const request = {
    playerId,
    requestedShipClass,
    tier,
    campaignId,
    statement:   statement?.trim() ?? null,
    status:      "pending",
    reviewedBy:  null,
    reviewNote:  null,
    stardate:    parseFloat(stardate.toFixed(1)),
    createdAt:   now,
    reviewedAt:  null,
  };

  const ref = await addDoc(collection(db(), "commandRequests"), request);
  return { request: { id: ref.id, ...request }, eligibility };
}

/**
 * Approve or deny a command request (Fleet Command action).
 *
 * On approval:
 *   - Creates a shipCommands record
 *   - Assigns the player as Captain via assignToShip()
 *   - Optionally assigns the ship to a task force
 *
 * @param {object} params
 * @param {string}  params.requestId
 * @param {string}  params.decision      "approved" | "denied"
 * @param {string}  params.reviewedBy    Officer ID approving/denying
 * @param {string}  [params.shipId]      Required on approval — the actual ship's Firestore ID
 * @param {string}  [params.taskForceId] Assign ship to this task force on approval
 * @param {string}  [params.reviewNote]  Explanation for denial or approval conditions
 * @returns {Promise<{ request: object, command: object|null }>}
 * @throws  Error with .status 400 | 404 | 409
 */
export async function reviewCommandRequest({ requestId, decision, reviewedBy, shipId = null, taskForceId = null, reviewNote = null }) {
  if (!requestId  || typeof requestId  !== "string") throw Object.assign(new Error("requestId is required."),  { status: 400 });
  if (!reviewedBy || typeof reviewedBy !== "string") throw Object.assign(new Error("reviewedBy is required."), { status: 400 });
  if (!["approved", "denied"].includes(decision)) {
    throw Object.assign(new Error("decision must be 'approved' or 'denied'."), { status: 400 });
  }
  if (decision === "approved" && (!shipId || typeof shipId !== "string")) {
    throw Object.assign(new Error("shipId is required when approving a command request."), { status: 400 });
  }

  const reqRef  = doc(db(), "commandRequests", requestId);
  const reqSnap = await getDoc(reqRef);

  if (!reqSnap.exists()) throw Object.assign(new Error("Command request not found."), { status: 404 });

  const reqData = reqSnap.data();
  if (reqData.status !== "pending") {
    throw Object.assign(new Error(`Request is already ${reqData.status}.`), { status: 409 });
  }

  const stardate = await safeStardate();
  const now      = new Date().toISOString();

  // Update request record
  const reqPatch = {
    status:     decision,
    reviewedBy,
    reviewNote: reviewNote?.trim() ?? null,
    reviewedAt: now,
  };
  await updateDoc(reqRef, reqPatch);

  if (decision === "denied") {
    return { request: { id: requestId, ...reqData, ...reqPatch }, command: null };
  }

  // ── Approval: create ship command record ──────────────────────────────────

  // Check ship isn't already under command
  const existingCmd = await getDoc(doc(db(), "shipCommands", shipId));
  if (existingCmd.exists() && existingCmd.data().status === "active") {
    throw Object.assign(
      new Error(`Ship ${shipId} already has an active commander.`),
      { status: 409 },
    );
  }

  const command = {
    shipId,
    captainPlayerId:    reqData.playerId,
    shipClass:          reqData.requestedShipClass,
    tier:               reqData.tier,
    campaignId:         reqData.campaignId,
    taskForceId:        taskForceId ?? null,
    assignmentStardate: parseFloat(stardate.toFixed(1)),
    commandRequestId:   requestId,
    status:             "active",
    createdAt:          now,
  };

  // shipCommands keyed by shipId — one active command per ship
  await setDoc(doc(db(), "shipCommands", shipId), command);

  // Assign as Captain via fleet engine
  try {
    await assignToShip({
      playerId:   reqData.playerId,
      shipId,
      role:       "Captain",
      rank:       reqData.rank ?? (await getCurrentRank(reqData.playerId)),
      campaignId: reqData.campaignId,
      force:      false,
    });
  } catch (err) {
    // Non-fatal if already assigned — command record is authoritative
    console.warn("[shipCommandEngine] assignToShip Captain warning:", err.message);
  }

  return { request: { id: requestId, ...reqData, ...reqPatch }, command: { id: shipId, ...command } };
}

// ─── Active command queries ───────────────────────────────────────────────────

/**
 * Get the current ship command record for a player.
 * Returns null if the player does not currently command a ship.
 *
 * @param {string} playerId
 * @returns {Promise<object|null>}
 */
export async function getPlayerCommand(playerId) {
  if (!playerId || typeof playerId !== "string") throw Object.assign(new Error("playerId is required."), { status: 400 });

  const snap = await getDocs(
    query(
      collection(db(), "shipCommands"),
      where("captainPlayerId", "==", playerId),
      where("status",          "==", "active"),
      limit(1),
    ),
  );
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/**
 * Get the command record for a specific ship.
 *
 * @param {string} shipId
 * @returns {Promise<object|null>}
 */
export async function getShipCommand(shipId) {
  if (!shipId || typeof shipId !== "string") throw Object.assign(new Error("shipId is required."), { status: 400 });

  const snap = await getDoc(doc(db(), "shipCommands", shipId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─── Crew management (captain-only actions) ───────────────────────────────────

/**
 * Assign a crew member to a role on the captain's ship.
 *
 * The requesting captain must be the active commander of the ship.
 * Delegates to fleet engine assignToShip for the actual assignment.
 *
 * @param {object} params
 * @param {string}  params.captainPlayerId  The captain making the assignment
 * @param {string}  params.shipId
 * @param {string}  params.crewPlayerId     Player being assigned
 * @param {string}  params.role             One of ASSIGNABLE_CREW_ROLES
 * @param {string}  params.rank             Rank for the assignment
 * @param {string}  [params.campaignId]
 * @returns {Promise<object>}  The crew assignment
 * @throws  Error with .status 400 | 403 | 404
 */
export async function assignCaptainsCrewMember({ captainPlayerId, shipId, crewPlayerId, role, rank, campaignId = null }) {
  if (!captainPlayerId || typeof captainPlayerId !== "string") throw Object.assign(new Error("captainPlayerId is required."), { status: 400 });
  if (!shipId          || typeof shipId          !== "string") throw Object.assign(new Error("shipId is required."),          { status: 400 });
  if (!crewPlayerId    || typeof crewPlayerId    !== "string") throw Object.assign(new Error("crewPlayerId is required."),    { status: 400 });
  if (!ASSIGNABLE_CREW_ROLES.includes(role)) {
    throw Object.assign(
      new Error(`role must be one of: ${ASSIGNABLE_CREW_ROLES.join(", ")}.`),
      { status: 400 },
    );
  }

  // Verify the requesting player is the active captain of this ship
  const command = await getShipCommand(shipId);
  if (!command || command.captainPlayerId !== captainPlayerId) {
    throw Object.assign(
      new Error("Only the active captain of this ship may assign crew."),
      { status: 403 },
    );
  }

  return assignToShip({ playerId: crewPlayerId, shipId, role, rank, campaignId });
}

/**
 * Relinquish command of a ship (voluntary or by Fleet Command order).
 *
 * @param {string} shipId
 * @param {string} reason   Brief reason for relinquishing command
 * @returns {Promise<void>}
 */
export async function relinquishCommand(shipId, reason = null) {
  if (!shipId || typeof shipId !== "string") throw Object.assign(new Error("shipId is required."), { status: 400 });

  const ref  = doc(db(), "shipCommands", shipId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw Object.assign(new Error("No command record found for this ship."), { status: 404 });

  await updateDoc(ref, {
    status:             "vacated",
    vacatedAt:          new Date().toISOString(),
    vacatedReason:      reason?.trim() ?? null,
  });
}
