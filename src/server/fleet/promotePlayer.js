/**
 * promotePlayer.js
 * Express-compatible route handler for player rank changes.
 *
 * POST /api/fleet/promote — advance a player's rank by one step or to a target rank
 * GET  /api/fleet/rank/:playerId — get current rank and promotion history
 *
 * All promotions are recorded permanently in promotionRecords for audit.
 * Demotion (rank decrease) is supported with force=true.
 */

import {
  RANKS,
  RANK_INDEX,
  getCurrentRank,
  setCurrentRank,
  writePromotionRecord,
  getPromotionHistory,
} from "./fleetEngine.js";
import { getCurrentStardate } from "../time/timeEngine.js";

// ─── POST /api/fleet/promote ──────────────────────────────────────────────────

/**
 * Promote (or demote with force) a player's Starfleet rank.
 *
 * If targetRank is not provided, advances one step up the rank ladder.
 *
 * Request body:
 * {
 *   playerId:    string   — player being promoted
 *   approvedBy:  string   — officer/player ID approving the promotion
 *   targetRank?: string   — specific rank to promote to (omit to advance one step)
 *   campaignId?: string
 *   force?:      boolean  — allow demotion (rank decrease)
 * }
 *
 * Response:
 * {
 *   playerId:   string,
 *   oldRank:    string,
 *   newRank:    string,
 *   record:     PromotionRecord,
 *   message:    string,
 * }
 */
export async function handlePromotePlayer(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    playerId,
    approvedBy,
    targetRank  = null,
    campaignId  = null,
    force       = false,
  } = req.body ?? {};

  if (!playerId   || typeof playerId   !== "string") return res.status(400).json({ error: "playerId is required." });
  if (!approvedBy || typeof approvedBy !== "string") return res.status(400).json({ error: "approvedBy is required." });

  if (targetRank !== null && !RANKS.includes(targetRank)) {
    return res.status(400).json({ error: `targetRank must be one of: ${RANKS.join(", ")}.` });
  }

  // ── Fetch current rank ─────────────────────────────────────────────────────
  let oldRank;
  try {
    oldRank = await getCurrentRank(playerId);
  } catch (err) {
    console.error("[promotePlayer] getCurrentRank error:", err.message);
    return res.status(500).json({ error: "Failed to retrieve current rank." });
  }

  // ── Compute new rank ───────────────────────────────────────────────────────
  let newRank;
  if (targetRank) {
    newRank = targetRank;
  } else {
    const currentIndex = RANK_INDEX[oldRank] ?? 0;
    if (currentIndex >= RANKS.length - 1) {
      return res.status(400).json({
        error: `${oldRank} is the highest rank. No further promotion available.`,
      });
    }
    newRank = RANKS[currentIndex + 1];
  }

  // Guard against demotion without force flag
  const oldIndex = RANK_INDEX[oldRank] ?? 0;
  const newIndex = RANK_INDEX[newRank] ?? 0;

  if (newIndex < oldIndex && !force) {
    return res.status(400).json({
      error: `${newRank} is a lower rank than current ${oldRank}. Pass force=true to demote.`,
    });
  }

  if (newRank === oldRank) {
    return res.status(400).json({ error: `Player is already ranked ${oldRank}.` });
  }

  // ── Fetch stardate ─────────────────────────────────────────────────────────
  let stardate;
  try {
    stardate = await getCurrentStardate();
  } catch (err) {
    console.warn("[promotePlayer] Time engine unavailable:", err.message);
    stardate = 53100.0;
  }

  // ── Apply rank change + write immutable record ─────────────────────────────
  let record;
  try {
    await setCurrentRank(playerId, newRank);
    record = await writePromotionRecord({
      playerId,
      oldRank,
      newRank,
      stardate,
      approvedBy,
      campaignId,
    });
  } catch (err) {
    const status = err.status ?? 500;
    console.error("[promotePlayer] Error:", err.message);
    return res.status(status).json({ error: err.message });
  }

  const action = newIndex > oldIndex ? "promoted" : "reduced in rank";
  return res.status(200).json({
    playerId,
    oldRank,
    newRank,
    record,
    message: `Player ${playerId} has been ${action} from ${oldRank} to ${newRank}. Stardate ${stardate.toFixed(1)}.`,
  });
}

// ─── GET /api/fleet/rank/:playerId ────────────────────────────────────────────

/**
 * Return a player's current rank and full promotion history.
 */
export async function handleGetPlayerRank(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const playerId = req.query?.playerId ?? req.params?.playerId;

  if (!playerId || typeof playerId !== "string") {
    return res.status(400).json({ error: "playerId is required." });
  }

  let currentRank, history;
  try {
    [currentRank, history] = await Promise.all([
      getCurrentRank(playerId),
      getPromotionHistory(playerId),
    ]);
  } catch (err) {
    console.error("[getPlayerRank] Error:", err.message);
    return res.status(500).json({ error: "Failed to retrieve rank data." });
  }

  return res.status(200).json({
    playerId,
    currentRank,
    rankIndex: RANK_INDEX[currentRank] ?? 0,
    history,
  });
}
