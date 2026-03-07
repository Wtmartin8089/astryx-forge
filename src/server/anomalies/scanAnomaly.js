/**
 * scanAnomaly.js
 * Investigation scan: advances an anomaly's investigation_level.
 *
 * Level progression:
 *   0  unknown          → detected but not yet scanned
 *   1  preliminary scan → type and category revealed
 *   2  detailed analysis → intensity, description revealed
 *   3  scientific study  → resolution hint revealed
 *   4  resolved          → investigation complete, status updated
 *
 * Each call to scanAnomaly advances by one level.
 * Idempotent at level 4 — returns current data without writing.
 */

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getServerDb } from "../firebase/serverDb.js";

// ─── Sanitization by investigation level ──────────────────────────────────────

/**
 * Return only the fields appropriate for the current investigation level.
 * Higher levels reveal progressively more detail.
 *
 * @param {object} anomaly  Full anomaly data from Firestore
 * @returns {object}        Client-safe payload
 */
function sanitizeByLevel(anomaly) {
  const base = {
    id:                 anomaly.id,
    systemId:           anomaly.systemId,
    investigationLevel: anomaly.investigationLevel,
    status:             anomaly.status,
    discoveredBy:       anomaly.discoveredBy   ?? null,
    discoveredStardate: anomaly.discoveredStardate ?? null,
  };

  const lvl = anomaly.investigationLevel ?? 0;

  if (lvl === 0) {
    // Nothing revealed yet — anomaly was detected but not scanned
    return { ...base, label: "Anomalous reading — scan required" };
  }

  if (lvl === 1) {
    // Preliminary: type and category only
    return {
      ...base,
      type:     anomaly.type,
      category: anomaly.category,
    };
  }

  if (lvl === 2) {
    // Detailed: add intensity and description
    return {
      ...base,
      type:        anomaly.type,
      category:    anomaly.category,
      intensity:   anomaly.intensity,
      description: anomaly.description,
    };
  }

  // Level 3 and 4: full data including resolution hint
  return {
    ...base,
    type:            anomaly.type,
    category:        anomaly.category,
    intensity:       anomaly.intensity,
    description:     anomaly.description,
    resolutionHint:  anomaly.resolutionHint,
  };
}

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Advance one investigation level on an anomaly.
 *
 * @param {string} anomalyId
 * @param {string} campaignId
 * @param {string} shipId
 * @returns {Promise<{ anomaly: object, upgraded: boolean, message: string }>}
 * @throws  Error with .status 404 | 403 | 400
 */
export async function scanAnomaly(anomalyId, campaignId, shipId) {
  const db  = getServerDb();
  const ref = doc(db, "anomalies", anomalyId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw Object.assign(new Error("Anomaly not found."), { status: 404 });
  }

  const data = snap.data();

  if (data.campaignId !== campaignId) {
    throw Object.assign(
      new Error("Anomaly does not belong to this campaign."),
      { status: 403 },
    );
  }

  const currentLevel = data.investigationLevel ?? 0;
  const MAX_LEVEL    = 4;

  // Already fully resolved — idempotent
  if (currentLevel >= MAX_LEVEL) {
    return {
      anomaly:  sanitizeByLevel({ id: anomalyId, ...data }),
      upgraded: false,
      message:  "Anomaly investigation is complete.",
    };
  }

  const newLevel  = currentLevel + 1;
  const resolved  = newLevel === MAX_LEVEL;
  const now       = new Date().toISOString();

  const update: Record<string, unknown> = {
    investigationLevel: newLevel,
    status:             resolved ? "resolved" : "active",
    lastScannedBy:      shipId,
    lastScannedAt:      now,
  };

  // Mark discovery on first scan
  if (currentLevel === 0) {
    update.discoveredBy       = shipId;
    update.discoveredStardate = now;
    update.status             = "active";
  }

  await updateDoc(ref, update);

  const updated = { id: anomalyId, ...data, ...update };

  const levelLabels: Record<number, string> = {
    1: "Preliminary scan complete.",
    2: "Detailed analysis complete.",
    3: "Scientific study complete. Resolution approach identified.",
    4: "Investigation resolved.",
  };

  return {
    anomaly:  sanitizeByLevel(updated),
    upgraded: true,
    message:  levelLabels[newLevel] ?? "Scan complete.",
  };
}
