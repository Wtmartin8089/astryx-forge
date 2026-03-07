/**
 * timeEngine.js
 * Global time system for the Astryx Forge universe.
 *
 * All ships, missions, anomalies, and events reference the single canonical
 * stardate stored here. No system should track its own time independently.
 *
 * Firestore collections:
 *   universeTime      One document (id: "singleton") — enforces single-record rule
 *   scheduledEvents   Time-triggered events, checked on every tick
 *
 * ── Architecture note (Vercel serverless) ──────────────────────────────────────
 * This engine is stateless between invocations. The "loop" is driven externally
 * — identical to how the warp engine works via navigation/tick.js:
 *
 *   Option A — Vercel cron (vercel.json):
 *     { "crons": [{ "path": "/api/time/tick", "schedule": "* * * * *" }] }
 *     Minimum resolution: 1 minute. For tighter intervals use Option B.
 *
 *   Option B — client polling:
 *     setInterval(() => fetch("/api/time/tick", { method: "POST" }), 10_000);
 *     Call while any time-sensitive operation is in progress.
 *
 *   Route handler (pages/api/time/tick.js):
 *     import { advanceStardate } from "../../src/server/time/timeEngine.js";
 *     export default async (req, res) => res.json(await advanceStardate());
 *
 * ── Server startup ─────────────────────────────────────────────────────────────
 *   Call initTimeEngine() once on cold-start (e.g., in a /api/startup route or
 *   the first API route that executes). It is fully idempotent — safe to call
 *   every request if needed.
 *
 * ── Integration (other modules) ───────────────────────────────────────────────
 *   import { getCurrentStardate, scheduleEvent } from "../time/timeEngine.js";
 *   import { timestampEvent, stardateReached }   from "../time/timeHelpers.js";
 *
 *   // Read time:
 *   const sd = await getCurrentStardate();
 *
 *   // Stamp an event:
 *   const logEntry = timestampEvent({ shipId, sector }, sd);
 *
 *   // Schedule an anomaly collapse:
 *   await scheduleEvent({ type: "anomaly_collapse", payload: { anomalyId } }, sd + 45.0);
 *
 *   // Check warp arrival:
 *   if (stardateReached(sd, ship.arrivalStardate)) { ... }
 *
 * ── Composite index required ───────────────────────────────────────────────────
 *   The scheduledEvents query uses (fired ASC, triggerStardate ASC).
 *   Firestore will log the index-creation URL on first use — follow it once.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  writeBatch,
} from "firebase/firestore";
import { getServerDb } from "../firebase/serverDb.js";
import {
  STARTING_STARDATE,
  TICK_INCREMENT,
  incrementStardate,
  stardateReached,
  stardateToString,
  getCurrentShift,
} from "./timeHelpers.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Fixed Firestore document ID for the universe-time singleton.
 * Using a constant ID enforces the one-record-only constraint at the schema level.
 */
const UNIVERSE_TIME_ID = "singleton";

/** Max scheduled events processed per tick to bound Firestore batch size. */
const MAX_EVENTS_PER_TICK = 50;

// ─── Internal helpers ─────────────────────────────────────────────────────────

function db() {
  return getServerDb();
}

function universeTimeRef() {
  return doc(db(), "universeTime", UNIVERSE_TIME_ID);
}

// ─── Scheduled event processor ────────────────────────────────────────────────

/**
 * Find all scheduled events whose triggerStardate has been reached,
 * mark them fired in a single batch write, and return them.
 *
 * Callers receive firedEvents in advanceStardate() and dispatch game logic
 * accordingly (collapse anomaly, expire distress signal, unlock mission, etc.).
 *
 * Requires composite Firestore index: scheduledEvents (fired ASC, triggerStardate ASC).
 *
 * @param {number} currentStardate
 * @returns {Promise<object[]>}  Fired event documents
 */
async function processDueEvents(currentStardate) {
  const snap = await getDocs(
    query(
      collection(db(), "scheduledEvents"),
      where("fired", "==", false),
      where("triggerStardate", "<=", currentStardate),
      orderBy("triggerStardate", "asc"),
      limit(MAX_EVENTS_PER_TICK),
    ),
  );

  if (snap.empty) return [];

  const firedAt = new Date().toISOString();
  const batch   = writeBatch(db());
  const fired   = [];

  for (const docSnap of snap.docs) {
    batch.update(docSnap.ref, { fired: true, firedAt });
    fired.push({ id: docSnap.id, ...docSnap.data(), fired: true, firedAt });
  }

  await batch.commit();
  return fired;
}

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Initialize the universe-time singleton in Firestore.
 *
 * Idempotent — safe to call on every server cold-start.
 * Creates the record at STARTING_STARDATE only if it does not already exist.
 * The fixed document ID "singleton" enforces the one-record constraint
 * without requiring application-level guards.
 *
 * @returns {Promise<{ initialized: boolean, stardate: number }>}
 */
export async function initTimeEngine() {
  const ref  = universeTimeRef();
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const { currentStardate } = snap.data();
    console.log(`[timeEngine] Universe time loaded — Stardate ${stardateToString(currentStardate)}, ${getCurrentShift(currentStardate)} shift`);
    return { initialized: false, stardate: currentStardate };
  }

  const now = new Date().toISOString();
  await setDoc(ref, {
    currentStardate:     STARTING_STARDATE,
    lastUpdateTimestamp: now,
    createdAt:           now,
  });

  console.log(`[timeEngine] Universe time initialized — Stardate ${stardateToString(STARTING_STARDATE)}`);
  return { initialized: true, stardate: STARTING_STARDATE };
}

/**
 * Read the current universal stardate from Firestore.
 *
 * All systems that need the current time must call this — never store
 * a local copy. Every call reflects the true game-universe clock.
 *
 * @returns {Promise<number>}  e.g. 53122.7
 * @throws  Error with .status 503 if the time engine has not been initialized
 */
export async function getCurrentStardate() {
  const snap = await getDoc(universeTimeRef());

  if (!snap.exists()) {
    throw Object.assign(
      new Error("Universe time not initialized. Call initTimeEngine() on server startup."),
      { status: 503 },
    );
  }

  return snap.data().currentStardate;
}

/**
 * Advance the universal stardate by one tick (TICK_INCREMENT = 0.1 units).
 *
 * Called by the time tick route handler every 10 seconds.
 * After writing the new stardate, processes any scheduled events that have
 * become due and returns them so the route handler can dispatch game logic.
 *
 * Example progression per tick:
 *   53100.0 → 53100.1 → 53100.2 → ... → 53101.0 → 53101.1 ...
 *
 * @returns {Promise<{
 *   previousStardate: number,
 *   currentStardate:  number,
 *   increment:        number,
 *   shift:            string,
 *   firedEvents:      object[],
 * }>}
 * @throws  Error with .status 503 if not initialized
 */
export async function advanceStardate() {
  const ref  = universeTimeRef();
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw Object.assign(
      new Error("Universe time not initialized. Call initTimeEngine() on server startup."),
      { status: 503 },
    );
  }

  const previous = snap.data().currentStardate;
  const next     = incrementStardate(previous);

  await updateDoc(ref, {
    currentStardate:     next,
    lastUpdateTimestamp: new Date().toISOString(),
  });

  // Process any events triggered by reaching the new stardate
  const firedEvents = await processDueEvents(next).catch((err) => {
    console.warn("[timeEngine] Event processing error:", err.message);
    return [];
  });

  return {
    previousStardate: previous,
    currentStardate:  next,
    increment:        TICK_INCREMENT,
    shift:            getCurrentShift(next),
    firedEvents,
  };
}

/**
 * Schedule a future game event that fires when the stardate reaches triggerStardate.
 *
 * The event payload is persisted in Firestore and returned by advanceStardate()
 * once the trigger time arrives. The route handler is responsible for
 * acting on firedEvents — e.g. collapsing an anomaly, expiring a mission.
 *
 * Examples:
 *   // Anomaly collapse in 45 stardate units
 *   await scheduleEvent({ type: "anomaly_collapse", payload: { anomalyId } }, sd + 45.0);
 *
 *   // Mission deadline
 *   await scheduleEvent({ type: "mission_expired", payload: { missionId }, campaignId }, sd + 14.0);
 *
 *   // Distress signal expiry
 *   await scheduleEvent({ type: "distress_signal_expired", payload: { signalId } }, 53133.4);
 *
 * @param {object} event
 * @param {string}  event.type          Machine-readable event type (e.g. "anomaly_collapse")
 * @param {string}  [event.description] Human-readable label for logs
 * @param {object}  [event.payload]     Arbitrary data returned when the event fires
 * @param {string}  [event.campaignId]  Scope to a campaign (null = universe-wide)
 * @param {number}  triggerStardate     Stardate at which this event fires
 * @returns {Promise<{ id: string, type: string, triggerStardate: number }>}
 * @throws  Error with .status 400 for invalid inputs
 */
export async function scheduleEvent(event, triggerStardate) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw Object.assign(new Error("event must be a plain object."), { status: 400 });
  }
  if (!event.type || typeof event.type !== "string") {
    throw Object.assign(new Error("event.type is required."), { status: 400 });
  }
  if (typeof triggerStardate !== "number" || isNaN(triggerStardate)) {
    throw Object.assign(new Error("triggerStardate must be a number."), { status: 400 });
  }

  // Non-fatal: warn if scheduling in the past — event fires on next tick
  let currentStardate = null;
  try {
    currentStardate = await getCurrentStardate();
    if (stardateReached(currentStardate, triggerStardate)) {
      console.warn(
        `[timeEngine] scheduleEvent: triggerStardate ${triggerStardate} is already reached ` +
        `(current: ${currentStardate}). Event will fire on next tick.`,
      );
    }
  } catch {
    // Allow scheduling even before initTimeEngine() completes
  }

  const normalizedTrigger = parseFloat(triggerStardate.toFixed(1));

  const ref = await addDoc(collection(db(), "scheduledEvents"), {
    type:             event.type,
    description:      event.description  ?? null,
    payload:          event.payload      ?? {},
    campaignId:       event.campaignId   ?? null,
    triggerStardate:  normalizedTrigger,
    fired:            false,
    firedAt:          null,
    scheduledAt:      new Date().toISOString(),
    scheduledDuring:  currentStardate,
  });

  return {
    id:             ref.id,
    type:           event.type,
    triggerStardate: normalizedTrigger,
  };
}
