/**
 * firstContactEngine.js
 * Orchestration engine for first contact events.
 *
 * Responsibilities:
 *   1. Accept a first contact trigger (scan, away team, detected, distress signal)
 *   2. Generate or retrieve the civilization profile for the planet
 *   3. Accept the captain's chosen action
 *   4. Compute the contact outcome
 *   5. Persist the contact record to Firestore (firstContactRecords)
 *   6. Create a Galactic Archive entry for the species
 *   7. Return the full contact result
 *
 * Firestore collections:
 *   firstContactRecords   One document per contact event
 *
 * ── Typical call sequence ──────────────────────────────────────────────────────
 *   // Step 1 — trigger detected (e.g. planet scan reveals life signs + civilization)
 *   const profile = await detectCivilization({ planetId, planetSeed, shipId, campaignId, stardate });
 *
 *   // Step 2 — captain chooses action, submit outcome
 *   const result = await resolveFirstContact({
 *     contactId, captainAction: "send_diplomatic_envoy", shipId, stardate, campaignId,
 *   });
 *
 * ── Archive integration ────────────────────────────────────────────────────────
 *   After a successful first contact, a species entry is automatically created
 *   in the Galactic Archive (archiveEntries collection) via createEntry().
 *   The archive entry ID is stored on the firstContactRecord as archiveEntryId.
 */

import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { getServerDb } from "../firebase/serverDb.js";
import { generateCivilization } from "./generateCivilization.js";
import { generateOutcome, CAPTAIN_ACTIONS } from "./contactOutcome.js";
import { createEntry } from "../archive/archiveEngine.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Valid triggers that initiate a first contact event. */
export const CONTACT_TRIGGERS = [
  "planet_scan",               // ship scans an inhabited planet
  "away_team",                 // away team lands on populated world
  "detected_by_civilization",  // civilization detects the starship
  "distress_signal",           // distress signal received from the planet
];

/** Re-export for convenience so callers don't need to import contactOutcome separately. */
export { CAPTAIN_ACTIONS };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function db() {
  return getServerDb();
}

/**
 * Check if a first contact record already exists for this planet in this campaign.
 * Prevents duplicate records for repeated encounters with the same world.
 *
 * @param {string} planetId
 * @param {string} campaignId
 * @returns {Promise<object|null>}  Existing record or null
 */
async function findExistingContact(planetId, campaignId) {
  const snap = await getDocs(
    query(
      collection(db(), "firstContactRecords"),
      where("planetId",   "==", planetId),
      where("campaignId", "==", campaignId),
      limit(1),
    ),
  );
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// ─── Step 1: Detect civilization ─────────────────────────────────────────────

/**
 * Detect a civilization and create a pending first contact record.
 *
 * Called when a trigger event occurs (scan, away team, etc.) before the
 * captain makes a decision. Returns the civilization profile so the client
 * can display it and prompt the captain for an action.
 *
 * Idempotent: if a contact record already exists for this planet, the
 * existing record is returned without creating a duplicate.
 *
 * @param {object} params
 * @param {string}  params.planetId       Firestore planet document ID
 * @param {number}  params.planetSeed     Numeric seed for deterministic generation
 * @param {string}  params.shipId         Ship that triggered first contact
 * @param {string}  params.campaignId
 * @param {number}  params.stardate       Current universal stardate
 * @param {string}  [params.trigger]      One of CONTACT_TRIGGERS (default: "planet_scan")
 * @param {string}  [params.systemId]     Parent system ID for context
 * @returns {Promise<{ contactId: string, civilization: object, isNew: boolean }>}
 * @throws  Error with .status 400 for invalid input
 */
export async function detectCivilization({
  planetId,
  planetSeed,
  shipId,
  campaignId,
  stardate,
  trigger   = "planet_scan",
  systemId  = null,
}) {
  if (!planetId   || typeof planetId   !== "string") throw Object.assign(new Error("planetId is required."),   { status: 400 });
  if (!shipId     || typeof shipId     !== "string") throw Object.assign(new Error("shipId is required."),     { status: 400 });
  if (!campaignId || typeof campaignId !== "string") throw Object.assign(new Error("campaignId is required."), { status: 400 });
  if (typeof planetSeed !== "number" || isNaN(planetSeed)) throw Object.assign(new Error("planetSeed must be a number."), { status: 400 });
  if (typeof stardate   !== "number" || isNaN(stardate))   throw Object.assign(new Error("stardate must be a number."),   { status: 400 });
  if (!CONTACT_TRIGGERS.includes(trigger)) {
    throw Object.assign(
      new Error(`trigger must be one of: ${CONTACT_TRIGGERS.join(", ")}.`),
      { status: 400 },
    );
  }

  // Idempotent — return existing record if already detected
  const existing = await findExistingContact(planetId, campaignId);
  if (existing) {
    return { contactId: existing.id, civilization: existing.civilization, isNew: false };
  }

  // Generate the civilization deterministically from the planet seed
  const civilization = generateCivilization(planetSeed, planetId);

  const now = new Date().toISOString();
  const record = {
    // Spec fields
    speciesName:       civilization.speciesName,
    homeworld:         civilization.homeworld,
    civilizationLevel: civilization.civilizationLevel,
    firstContactShip:  shipId,
    stardate:          parseFloat(stardate.toFixed(1)),
    contactOutcome:    null,            // set after captain acts
    diplomaticStatus:  "pending",       // updated in resolveFirstContact

    // Extended context
    planetId,
    systemId,
    campaignId,
    trigger,
    captainAction:     null,
    civilization,                       // full profile for client display
    archiveEntryId:    null,            // set after archive entry is created
    status:            "pending",       // pending → resolved
    createdAt:         now,
    resolvedAt:        null,
  };

  const ref = await addDoc(collection(db(), "firstContactRecords"), record);
  return { contactId: ref.id, civilization, isNew: true };
}

// ─── Step 2: Resolve contact ──────────────────────────────────────────────────

/**
 * Apply the captain's decision and resolve the first contact outcome.
 *
 * Computes the reaction based on civilization traits and captain action,
 * updates the firstContactRecord, and creates a Galactic Archive entry
 * for the newly encountered species.
 *
 * @param {object} params
 * @param {string}  params.contactId      Firestore firstContactRecords document ID
 * @param {string}  params.captainAction  One of CAPTAIN_ACTIONS
 * @param {string}  params.shipId         Resolving ship ID (may differ from detecting ship)
 * @param {number}  params.stardate       Current universal stardate
 * @param {string}  params.campaignId
 * @returns {Promise<{
 *   record:           object,
 *   outcome:          string,
 *   diplomaticStatus: string,
 *   narrative:        string,
 *   archiveEntryId:   string|null,
 * }>}
 * @throws  Error with .status 404 | 400 | 409
 */
export async function resolveFirstContact({
  contactId,
  captainAction,
  shipId,
  stardate,
  campaignId,
}) {
  if (!contactId    || typeof contactId    !== "string") throw Object.assign(new Error("contactId is required."),    { status: 400 });
  if (!shipId       || typeof shipId       !== "string") throw Object.assign(new Error("shipId is required."),       { status: 400 });
  if (!campaignId   || typeof campaignId   !== "string") throw Object.assign(new Error("campaignId is required."),   { status: 400 });
  if (typeof stardate !== "number" || isNaN(stardate))   throw Object.assign(new Error("stardate must be a number."), { status: 400 });
  if (!CAPTAIN_ACTIONS.includes(captainAction)) {
    throw Object.assign(
      new Error(`captainAction must be one of: ${CAPTAIN_ACTIONS.join(", ")}.`),
      { status: 400 },
    );
  }

  const ref  = doc(db(), "firstContactRecords", contactId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw Object.assign(new Error("First contact record not found."), { status: 404 });
  }

  const record = snap.data();

  if (record.campaignId !== campaignId) {
    throw Object.assign(new Error("Contact record does not belong to this campaign."), { status: 403 });
  }
  if (record.status === "resolved") {
    throw Object.assign(
      new Error("This first contact has already been resolved."),
      { status: 409 },
    );
  }

  // Compute the contact outcome from civilization traits + captain action
  const { outcome, diplomaticStatus, narrative } = generateOutcome(
    record.civilization,
    captainAction,
  );

  // ── Create Galactic Archive entry for this species ────────────────────────
  let archiveEntryId = null;
  try {
    const archiveDescription = [
      narrative,
      `Civilization level: ${record.civilizationLevel.replace(/_/g, " ")}.`,
      `Primary traits: ${record.civilization.traits?.join(", ") ?? "unknown"}.`,
      `Homeworld: ${record.civilization.homeworld}.`,
      `Population estimate: ${record.civilization.population ?? "unknown"}.`,
    ].join(" ");

    const archiveEntry = await createEntry({
      entryType:        "species",
      name:             record.speciesName,
      description:      archiveDescription,
      discoveredByShip: record.firstContactShip,
      stardate,
      campaignId,
      visibility:       outcome === "hostile" ? "fleet" : "fleet",
      metadata: {
        contactId,
        planetId:          record.planetId,
        systemId:          record.systemId,
        civilizationLevel: record.civilizationLevel,
        traits:            record.civilization.traits,
        trigger:           record.trigger,
        captainAction,
        outcome,
        diplomaticStatus,
      },
    });
    archiveEntryId = archiveEntry.id;
  } catch (err) {
    // Archive creation is non-fatal — the contact record still resolves
    console.warn("[firstContactEngine] Archive entry creation failed:", err.message);
  }

  // ── Persist the resolved contact record ──────────────────────────────────
  const now = new Date().toISOString();
  const patch = {
    captainAction,
    contactOutcome:  outcome,
    diplomaticStatus,
    narrative,
    archiveEntryId,
    status:          "resolved",
    resolvedAt:      now,
    resolvedByShip:  shipId,
  };

  await updateDoc(ref, patch);

  return {
    record:          { id: contactId, ...record, ...patch },
    outcome,
    diplomaticStatus,
    narrative,
    archiveEntryId,
  };
}

// ─── Utility: get contact record ──────────────────────────────────────────────

/**
 * Retrieve a first contact record by ID.
 *
 * @param {string} contactId
 * @returns {Promise<object>}
 * @throws  Error with .status 404 if not found
 */
export async function getContactRecord(contactId) {
  if (!contactId || typeof contactId !== "string") {
    throw Object.assign(new Error("contactId is required."), { status: 400 });
  }

  const snap = await getDoc(doc(db(), "firstContactRecords", contactId));

  if (!snap.exists()) {
    throw Object.assign(new Error("First contact record not found."), { status: 404 });
  }

  return { id: snap.id, ...snap.data() };
}
