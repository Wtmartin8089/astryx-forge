/**
 * assignCrew.js
 * Express-compatible route handler for crew assignment operations.
 *
 * POST /api/fleet/assign  — assign a player to a ship
 * POST /api/fleet/relieve — remove a player from a ship
 * GET  /api/fleet/crew/:shipId — list all crew on a ship
 *
 * All three handlers are exported and wired to separate Vercel routes.
 */

import {
  assignToShip,
  relieveFromShip,
  getShipCrew,
  getCurrentRank,
  CREW_ROLES,
  RANKS,
} from "./fleetEngine.js";
import { getCurrentStardate } from "../time/timeEngine.js";

// ─── POST /api/fleet/assign ───────────────────────────────────────────────────

/**
 * Assign a player to a ship with a role and rank.
 *
 * Request body:
 * {
 *   playerId:    string
 *   shipId:      string
 *   role:        string   — one of CREW_ROLES
 *   rank?:       string   — one of RANKS (default: player's current rank)
 *   campaignId?: string
 *   force?:      boolean  — bypass rank-role minimum check
 * }
 */
export async function handleAssignCrew(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    playerId,
    shipId,
    role,
    campaignId = null,
    force      = false,
  } = req.body ?? {};

  // Rank is optional — defaults to the player's current recorded rank
  let { rank } = req.body ?? {};

  if (!playerId || typeof playerId !== "string") return res.status(400).json({ error: "playerId is required." });
  if (!shipId   || typeof shipId   !== "string") return res.status(400).json({ error: "shipId is required." });
  if (!role     || !CREW_ROLES.includes(role))   return res.status(400).json({ error: `role must be one of: ${CREW_ROLES.join(", ")}.` });

  // Resolve rank: use provided value, or fall back to player's current rank
  if (!rank) {
    try {
      rank = await getCurrentRank(playerId);
    } catch (err) {
      rank = "Cadet"; // safe default
    }
  }

  if (!RANKS.includes(rank)) {
    return res.status(400).json({ error: `rank must be one of: ${RANKS.join(", ")}.` });
  }

  let assignment;
  try {
    assignment = await assignToShip({ playerId, shipId, role, rank, campaignId, force: !!force });
  } catch (err) {
    const status = err.status ?? 500;
    console.error("[assignCrew] Error:", err.message);
    return res.status(status).json({ error: err.message });
  }

  return res.status(200).json({
    assignment,
    message: `${rank} assigned as ${role} aboard ship ${shipId}.`,
  });
}

// ─── POST /api/fleet/relieve ──────────────────────────────────────────────────

/**
 * Relieve a crew member from duty on a ship.
 *
 * Request body:
 * {
 *   playerId: string
 *   shipId:   string
 * }
 */
export async function handleRelieveCrew(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { playerId, shipId } = req.body ?? {};

  if (!playerId || typeof playerId !== "string") return res.status(400).json({ error: "playerId is required." });
  if (!shipId   || typeof shipId   !== "string") return res.status(400).json({ error: "shipId is required." });

  try {
    await relieveFromShip(playerId, shipId);
  } catch (err) {
    const status = err.status ?? 500;
    console.error("[relieveCrew] Error:", err.message);
    return res.status(status).json({ error: err.message });
  }

  return res.status(200).json({
    message: `Player ${playerId} has been relieved from ship ${shipId}.`,
  });
}

// ─── GET /api/fleet/crew/:shipId ──────────────────────────────────────────────

/**
 * Return all crew assignments for a ship.
 */
export async function handleGetShipCrew(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const shipId = req.query?.shipId ?? req.params?.shipId;

  if (!shipId || typeof shipId !== "string") {
    return res.status(400).json({ error: "shipId is required." });
  }

  let crew;
  try {
    crew = await getShipCrew(shipId);
  } catch (err) {
    console.error("[getShipCrew] Error:", err.message);
    return res.status(500).json({ error: "Failed to retrieve crew." });
  }

  return res.status(200).json({ shipId, count: crew.length, crew });
}
