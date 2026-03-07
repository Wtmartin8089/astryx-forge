/**
 * archiveEngine.js
 * Core read/write engine for the Galactic Archive.
 *
 * The Archive is a permanent Starfleet-style database of player discoveries.
 * All entries are immutable once created — history is preserved through
 * the edit log rather than overwriting original records.
 *
 * Firestore collections:
 *   archiveEntries   One document per discovery (all five entry types share this)
 *   archiveEdits     Flat edit log — one document per edit, linked by entryId
 *
 * Entry types and their Firestore "table" equivalent:
 *   species    ← archive_species
 *   system     ← archive_systems
 *   planet     ← archive_planets
 *   anomaly    ← archive_anomalies
 *   artifact   ← archive_artifacts
 *
 * ── Firestore indexes required ──────────────────────────────────────────────
 *   archiveEntries: (entryType ASC, stardate DESC)
 *   archiveEntries: (campaignId ASC, entryType ASC, visibility ASC)
 *   archiveEdits:   (entryId ASC, stardate DESC)
 *   Follow the index creation links Firestore logs on first use.
 *
 * ── Integration ──────────────────────────────────────────────────────────────
 *   import { createEntry, editEntry, getEntry, searchEntries } from "../archive/archiveEngine.js";
 *
 *   // After a first contact event:
 *   const entry = await createEntry({
 *     entryType: "species", name: "Unnamed xenobiological entity",
 *     description: "...", discoveredByShip: shipId, stardate, campaignId,
 *   });
 *
 *   // After science team adds detail:
 *   await editEntry(entry.id, shipId, "Updated morphology data from sensor analysis.", stardate);
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
  orderBy,
  limit,
  or,
} from "firebase/firestore";
import { getServerDb } from "../firebase/serverDb.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Valid archive entry types. Each maps to a "table" in the spec. */
export const ENTRY_TYPES = ["species", "system", "planet", "anomaly", "artifact"];

/** Valid visibility levels — widening order. */
export const VISIBILITY_LEVELS = [
  "classified", // visible to discovering ship + admin only
  "fleet",      // visible to all ships in the same campaign
  "public",     // visible to any player across campaigns
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function db() {
  return getServerDb();
}

function isValidEntryType(v) {
  return ENTRY_TYPES.includes(v);
}

function isValidVisibility(v) {
  return VISIBILITY_LEVELS.includes(v);
}

// ─── Core: create ─────────────────────────────────────────────────────────────

/**
 * Create a new archive entry and persist it permanently.
 *
 * The original record is never overwritten. All future changes are captured
 * in the archiveEdits collection and reflected in lastEditedAt only.
 *
 * @param {object} params
 * @param {string}  params.entryType       One of ENTRY_TYPES
 * @param {string}  params.name            Common name for this discovery
 * @param {string}  params.description     Full archive entry body
 * @param {string}  params.discoveredByShip  Ship that made the discovery
 * @param {number}  params.stardate        Universal stardate of discovery
 * @param {string}  [params.campaignId]    Campaign scope (null = cross-campaign)
 * @param {string}  [params.visibility]    Default: "fleet"
 * @param {object}  [params.metadata]      Type-specific detail (coordinates, classification, etc.)
 * @returns {Promise<object>}  Saved entry with Firestore id
 * @throws  Error with .status 400 for validation failures
 */
export async function createEntry({
  entryType,
  name,
  description,
  discoveredByShip,
  stardate,
  campaignId  = null,
  visibility  = "fleet",
  metadata    = {},
}) {
  if (!isValidEntryType(entryType)) {
    throw Object.assign(
      new Error(`entryType must be one of: ${ENTRY_TYPES.join(", ")}.`),
      { status: 400 },
    );
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    throw Object.assign(new Error("name is required."), { status: 400 });
  }
  if (!description || typeof description !== "string" || !description.trim()) {
    throw Object.assign(new Error("description is required."), { status: 400 });
  }
  if (!discoveredByShip || typeof discoveredByShip !== "string") {
    throw Object.assign(new Error("discoveredByShip is required."), { status: 400 });
  }
  if (typeof stardate !== "number" || isNaN(stardate)) {
    throw Object.assign(new Error("stardate must be a number."), { status: 400 });
  }
  if (!isValidVisibility(visibility)) {
    throw Object.assign(
      new Error(`visibility must be one of: ${VISIBILITY_LEVELS.join(", ")}.`),
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const entry = {
    entryType,
    name:             name.trim(),
    description:      description.trim(),
    discoveredByShip,
    stardate:         parseFloat(stardate.toFixed(1)),
    campaignId,
    visibility,
    metadata,
    editCount:        0,
    lastEditedAt:     null,
    lastEditedBy:     null,
    createdAt:        now,
  };

  const ref = await addDoc(collection(db(), "archiveEntries"), entry);
  return { id: ref.id, ...entry };
}

// ─── Core: edit ───────────────────────────────────────────────────────────────

/**
 * Record an edit to an existing archive entry.
 *
 * Writes a new document to archiveEdits and updates lastEditedAt / editCount
 * on the entry. The original description is never overwritten — the edit log
 * is the canonical history.
 *
 * To update the entry's displayed description, pass a newDescription.
 * If omitted, only the edit history record is created (annotation mode).
 *
 * @param {string}  entryId            Firestore ID of the archive entry
 * @param {string}  editor             Ship ID or officer name making the edit
 * @param {string}  changeDescription  Summary of what was changed and why
 * @param {number}  stardate           Universal stardate of this edit
 * @param {string}  [newDescription]   If provided, updates the entry's description
 * @param {string}  [newVisibility]    If provided, updates visibility level
 * @returns {Promise<{ entry: object, edit: object }>}
 * @throws  Error with .status 404 if entry not found | 400 for bad input
 */
export async function editEntry(entryId, editor, changeDescription, stardate, newDescription, newVisibility) {
  if (!entryId || typeof entryId !== "string") {
    throw Object.assign(new Error("entryId is required."), { status: 400 });
  }
  if (!editor || typeof editor !== "string") {
    throw Object.assign(new Error("editor is required."), { status: 400 });
  }
  if (!changeDescription || typeof changeDescription !== "string" || !changeDescription.trim()) {
    throw Object.assign(new Error("changeDescription is required."), { status: 400 });
  }
  if (typeof stardate !== "number" || isNaN(stardate)) {
    throw Object.assign(new Error("stardate must be a number."), { status: 400 });
  }
  if (newVisibility !== undefined && !isValidVisibility(newVisibility)) {
    throw Object.assign(
      new Error(`visibility must be one of: ${VISIBILITY_LEVELS.join(", ")}.`),
      { status: 400 },
    );
  }

  const entryRef  = doc(db(), "archiveEntries", entryId);
  const entrySnap = await getDoc(entryRef);

  if (!entrySnap.exists()) {
    throw Object.assign(new Error("Archive entry not found."), { status: 404 });
  }

  const now = new Date().toISOString();
  const currentData = entrySnap.data();

  // Write the edit record
  const editRecord = {
    entryId,
    editor,
    changeDescription: changeDescription.trim(),
    stardate:          parseFloat(stardate.toFixed(1)),
    previousEditCount: currentData.editCount ?? 0,
    createdAt:         now,
  };
  const editRef = await addDoc(collection(db(), "archiveEdits"), editRecord);

  // Update the entry's mutable fields
  const entryPatch = {
    editCount:    (currentData.editCount ?? 0) + 1,
    lastEditedAt: now,
    lastEditedBy: editor,
  };
  if (newDescription && typeof newDescription === "string" && newDescription.trim()) {
    entryPatch.description = newDescription.trim();
  }
  if (newVisibility) {
    entryPatch.visibility = newVisibility;
  }

  await updateDoc(entryRef, entryPatch);

  return {
    entry: { id: entryId, ...currentData, ...entryPatch },
    edit:  { id: editRef.id, ...editRecord },
  };
}

// ─── Core: get single entry ───────────────────────────────────────────────────

/**
 * Fetch a single archive entry with its full edit history.
 *
 * @param {string} entryId
 * @returns {Promise<{ entry: object, edits: object[] }>}
 * @throws  Error with .status 404 if not found
 */
export async function getEntry(entryId) {
  if (!entryId || typeof entryId !== "string") {
    throw Object.assign(new Error("entryId is required."), { status: 400 });
  }

  const snap = await getDoc(doc(db(), "archiveEntries", entryId));

  if (!snap.exists()) {
    throw Object.assign(new Error("Archive entry not found."), { status: 404 });
  }

  // Fetch edit history sorted oldest-first (chronological reading order)
  const editsSnap = await getDocs(
    query(
      collection(db(), "archiveEdits"),
      where("entryId", "==", entryId),
      orderBy("stardate", "asc"),
    ),
  );

  const edits = editsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return {
    entry: { id: snap.id, ...snap.data() },
    edits,
  };
}

// ─── Core: search ─────────────────────────────────────────────────────────────

/**
 * Search the archive with optional filters.
 *
 * When a text query is provided, results are filtered in-memory after
 * Firestore retrieval (Firestore doesn't support full-text search natively).
 * All other filters are applied as Firestore where() clauses.
 *
 * @param {object} params
 * @param {string}  [params.entryType]         Filter by type
 * @param {string}  [params.campaignId]        Filter by campaign
 * @param {string}  [params.visibility]        Filter by visibility
 * @param {string}  [params.discoveredByShip]  Filter by discovering ship
 * @param {string}  [params.q]                 Text search against name + description
 * @param {number}  [params.limit]             Max results (default 50, max 200)
 * @returns {Promise<object[]>}  Matching entries, sorted by stardate DESC
 */
export async function searchEntries({
  entryType,
  campaignId,
  visibility,
  discoveredByShip,
  q,
  limit: requestedLimit = 50,
} = {}) {
  const clampedLimit = Math.min(Math.max(1, requestedLimit), 200);

  const constraints = [];

  if (entryType) {
    if (!isValidEntryType(entryType)) {
      throw Object.assign(
        new Error(`entryType must be one of: ${ENTRY_TYPES.join(", ")}.`),
        { status: 400 },
      );
    }
    constraints.push(where("entryType", "==", entryType));
  }

  if (campaignId)       constraints.push(where("campaignId",       "==", campaignId));
  if (visibility)       constraints.push(where("visibility",       "==", visibility));
  if (discoveredByShip) constraints.push(where("discoveredByShip", "==", discoveredByShip));

  // Always sort by stardate DESC so newest discoveries appear first
  constraints.push(orderBy("stardate", "desc"));
  // Fetch extra to allow for in-memory text filtering without under-returning
  constraints.push(limit(q ? Math.min(clampedLimit * 4, 200) : clampedLimit));

  const snap = await getDocs(
    query(collection(db(), "archiveEntries"), ...constraints),
  );

  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // In-memory text filter against name and description
  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    results = results.filter(
      (e) =>
        e.name?.toLowerCase().includes(term) ||
        e.description?.toLowerCase().includes(term),
    );
  }

  return results.slice(0, clampedLimit);
}
