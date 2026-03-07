/**
 * createEntry.js
 * Express-compatible route handler for POST /api/archive/create
 *
 * Creates a new Galactic Archive entry for a player discovery.
 * The current universal stardate is fetched automatically.
 *
 * Request body:
 * {
 *   entryType:        "species" | "system" | "planet" | "anomaly" | "artifact"
 *   name:             string   — common name for this discovery
 *   description:      string   — full archive body
 *   discoveredByShip: string   — ship ID that made the discovery
 *   campaignId?:      string   — campaign scope
 *   visibility?:      "classified" | "fleet" | "public"   (default: "fleet")
 *   metadata?:        object   — type-specific detail (coordinates, class, etc.)
 * }
 *
 * Response:
 * {
 *   entry:   { id, entryType, name, description, discoveredByShip, stardate, visibility, createdAt }
 *   message: string
 * }
 */

import { createEntry, ENTRY_TYPES, VISIBILITY_LEVELS } from "./archiveEngine.js";
import { getCurrentStardate } from "../time/timeEngine.js";

export async function handleCreateEntry(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    entryType,
    name,
    description,
    discoveredByShip,
    campaignId   = null,
    visibility   = "fleet",
    metadata     = {},
  } = req.body ?? {};

  // ── Validation ─────────────────────────────────────────────────────────────
  if (!entryType || !ENTRY_TYPES.includes(entryType)) {
    return res.status(400).json({
      error: `entryType must be one of: ${ENTRY_TYPES.join(", ")}.`,
    });
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required." });
  }
  if (!description || typeof description !== "string" || !description.trim()) {
    return res.status(400).json({ error: "description is required." });
  }
  if (!discoveredByShip || typeof discoveredByShip !== "string") {
    return res.status(400).json({ error: "discoveredByShip is required." });
  }
  if (!VISIBILITY_LEVELS.includes(visibility)) {
    return res.status(400).json({
      error: `visibility must be one of: ${VISIBILITY_LEVELS.join(", ")}.`,
    });
  }

  // ── Fetch universal stardate ───────────────────────────────────────────────
  let stardate;
  try {
    stardate = await getCurrentStardate();
  } catch (err) {
    console.warn("[createEntry] Time engine unavailable:", err.message);
    stardate = 53100.0;
  }

  // ── Write to archive ───────────────────────────────────────────────────────
  let entry;
  try {
    entry = await createEntry({
      entryType,
      name,
      description,
      discoveredByShip,
      stardate,
      campaignId,
      visibility,
      metadata: metadata && typeof metadata === "object" ? metadata : {},
    });
  } catch (err) {
    const status = err.status ?? 500;
    console.error("[createEntry] Error:", err.message);
    return res.status(status).json({ error: err.message });
  }

  return res.status(201).json({
    entry,
    message: `Archive entry created. Stardate ${stardate.toFixed(1)}.`,
  });
}
