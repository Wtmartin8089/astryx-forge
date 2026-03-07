/**
 * editEntry.js
 * Express-compatible route handler for POST /api/archive/edit
 *
 * Records an edit to an existing archive entry. The original record
 * is preserved — all changes are tracked in the archiveEdits collection.
 *
 * Request body:
 * {
 *   entryId:           string   — Firestore ID of the entry to edit
 *   editor:            string   — ship ID or officer name making the edit
 *   changeDescription: string   — summary of what was changed and why
 *   newDescription?:   string   — if provided, replaces the entry's description
 *   newVisibility?:    "classified" | "fleet" | "public"   — if provided, changes visibility
 * }
 *
 * Response:
 * {
 *   entry: object   — updated entry document
 *   edit:  object   — the new edit history record
 *   message: string
 * }
 */

import { editEntry, VISIBILITY_LEVELS } from "./archiveEngine.js";
import { getCurrentStardate } from "../time/timeEngine.js";

export async function handleEditEntry(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    entryId,
    editor,
    changeDescription,
    newDescription,
    newVisibility,
  } = req.body ?? {};

  // ── Validation ─────────────────────────────────────────────────────────────
  if (!entryId || typeof entryId !== "string") {
    return res.status(400).json({ error: "entryId is required." });
  }
  if (!editor || typeof editor !== "string") {
    return res.status(400).json({ error: "editor is required." });
  }
  if (!changeDescription || typeof changeDescription !== "string" || !changeDescription.trim()) {
    return res.status(400).json({ error: "changeDescription is required." });
  }
  if (newVisibility !== undefined && !VISIBILITY_LEVELS.includes(newVisibility)) {
    return res.status(400).json({
      error: `newVisibility must be one of: ${VISIBILITY_LEVELS.join(", ")}.`,
    });
  }

  // ── Fetch universal stardate ───────────────────────────────────────────────
  let stardate;
  try {
    stardate = await getCurrentStardate();
  } catch (err) {
    console.warn("[editEntry] Time engine unavailable:", err.message);
    stardate = 53100.0;
  }

  // ── Apply edit ─────────────────────────────────────────────────────────────
  let result;
  try {
    result = await editEntry(
      entryId,
      editor,
      changeDescription,
      stardate,
      newDescription,
      newVisibility,
    );
  } catch (err) {
    const status = err.status ?? 500;
    console.error("[editEntry] Error:", err.message);
    return res.status(status).json({ error: err.message });
  }

  return res.status(200).json({
    entry:   result.entry,
    edit:    result.edit,
    message: `Archive entry updated. Stardate ${stardate.toFixed(1)}.`,
  });
}
