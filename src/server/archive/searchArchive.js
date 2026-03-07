/**
 * searchArchive.js
 * Express-compatible route handlers for:
 *   GET /api/archive/search   — query the archive with filters
 *   GET /api/archive/:entryId — fetch a single entry with edit history
 *
 * Both handlers are exported individually and wired to separate Vercel
 * route files (pages/api/archive/search.js and pages/api/archive/[entryId].js).
 */

import { searchEntries, getEntry, ENTRY_TYPES, VISIBILITY_LEVELS } from "./archiveEngine.js";

// ─── GET /api/archive/search ──────────────────────────────────────────────────

/**
 * Search the Galactic Archive.
 *
 * Query parameters:
 *   q?                string  — text search against name + description
 *   entryType?        string  — filter by entry type
 *   campaignId?       string  — filter by campaign
 *   visibility?       string  — filter by visibility level
 *   discoveredByShip? string  — filter by discovering ship
 *   limit?            number  — max results (default 50, max 200)
 *
 * Response:
 * {
 *   count:   number,
 *   results: ArchiveEntry[],
 * }
 */
export async function handleSearchArchive(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    q,
    entryType,
    campaignId,
    visibility,
    discoveredByShip,
    limit: rawLimit,
  } = req.query ?? {};

  // ── Validate optional filters ───────────────────────────────────────────────
  if (entryType && !ENTRY_TYPES.includes(entryType)) {
    return res.status(400).json({
      error: `entryType must be one of: ${ENTRY_TYPES.join(", ")}.`,
    });
  }
  if (visibility && !VISIBILITY_LEVELS.includes(visibility)) {
    return res.status(400).json({
      error: `visibility must be one of: ${VISIBILITY_LEVELS.join(", ")}.`,
    });
  }

  const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : 50;
  if (isNaN(parsedLimit) || parsedLimit < 1) {
    return res.status(400).json({ error: "limit must be a positive integer." });
  }

  // ── Execute search ─────────────────────────────────────────────────────────
  let results;
  try {
    results = await searchEntries({
      entryType,
      campaignId,
      visibility,
      discoveredByShip,
      q,
      limit: parsedLimit,
    });
  } catch (err) {
    const status = err.status ?? 500;
    console.error("[searchArchive] Error:", err.message);
    if (err.message?.includes("index")) {
      return res.status(503).json({
        error: "A Firestore composite index is required for this query. Check server logs for the index creation link.",
      });
    }
    return res.status(status).json({ error: err.message });
  }

  return res.status(200).json({
    count:   results.length,
    results,
  });
}

// ─── GET /api/archive/:entryId ────────────────────────────────────────────────

/**
 * Fetch a single archive entry with its complete edit history.
 *
 * Response:
 * {
 *   entry: ArchiveEntry,
 *   edits: ArchiveEdit[],   — chronological, oldest first
 * }
 */
export async function handleGetEntry(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const entryId = req.query?.entryId ?? req.params?.entryId;

  if (!entryId || typeof entryId !== "string") {
    return res.status(400).json({ error: "entryId is required." });
  }

  let result;
  try {
    result = await getEntry(entryId);
  } catch (err) {
    const status = err.status ?? 500;
    console.error("[getEntry] Error:", err.message);
    return res.status(status).json({ error: err.message });
  }

  return res.status(200).json(result);
}
