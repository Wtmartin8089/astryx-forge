/**
 * buildMissionContext.js
 * Gathers campaign context from Firestore for AI mission generation.
 * Uses the Firebase client SDK (same credentials as the frontend).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { getServerDb } from "./../../server/firebase/serverDb.js";

/**
 * Assemble all relevant campaign context for the mission AI prompt.
 *
 * @param {string} campaignId
 * @returns {Promise<{
 *   campaignName: string,
 *   worldType: string,
 *   unitName: string,
 *   unitType: string,
 *   scanResult: string,
 *   scanReport: string,
 *   recentForumPosts: string[],
 *   factions: string[]
 * }>}
 */
export async function buildMissionContext(campaignId) {
  const db = getServerDb();

  // Run independent queries in parallel
  const [campaignSnap, unitsSnap, systemsSnap, forumSnap, factionsSnap] =
    await Promise.all([
      // Campaign document
      getDoc(doc(db, "campaigns", campaignId)),

      // Campaign units (ships/crew)
      getDocs(
        query(
          collection(db, "campaignUnits"),
          where("campaignId", "==", campaignId),
          limit(1),
        ),
      ),

      // Most recently discovered system
      getDocs(
        query(
          collection(db, "systems"),
          where("campaignId", "==", campaignId),
          where("discovered", "==", true),
          orderBy("createdAt", "desc"),
          limit(1),
        ),
      ),

      // Last 5 forum threads (used as narrative context)
      getDocs(
        query(
          collection(db, "forumThreads"),
          orderBy("createdAt", "desc"),
          limit(5),
        ),
      ),

      // Factions (optional collection — won't throw if missing)
      getDocs(
        query(
          collection(db, "factions"),
          where("campaignId", "==", campaignId),
          limit(10),
        ),
      ).catch(() => ({ docs: [] })),
    ]);

  // ── Campaign ──
  const campaign = campaignSnap.exists() ? campaignSnap.data() : {};
  const campaignName = campaign.name     ?? "Unknown Campaign";
  const worldType    = campaign.worldType ?? "fleet-command";

  // ── Primary unit (ship) ──
  const unitDoc  = unitsSnap.docs[0]?.data() ?? {};
  const unitName = unitDoc.name        ?? "Unknown Vessel";
  const unitType = unitDoc.type        ?? "Starship";
  const shipClass = unitDoc.shipClass  ? ` (${unitDoc.shipClass}-class)` : "";

  // ── Latest scan ──
  const systemDoc  = systemsSnap.docs[0]?.data() ?? {};
  const scanResult = systemDoc.name    ?? "Uncharted Space";
  const details    = systemDoc.details ?? {};
  const scanReport = [
    details.starType    ? `Star type: ${details.starType}` : null,
    details.planetCount != null ? `${details.planetCount} planets` : null,
    details.anomaly     ? `Anomaly: ${details.anomaly}` : null,
  ]
    .filter(Boolean)
    .join(". ") || "No sensor data available.";

  // ── Recent forum posts (titles as narrative thread) ──
  const recentForumPosts = forumSnap.docs
    .map((d) => d.data().title ?? "")
    .filter(Boolean);

  // ── Factions ──
  const factions = factionsSnap.docs
    .map((d) => d.data().name ?? "")
    .filter(Boolean);

  return {
    campaignName,
    worldType,
    unitName: `${unitName}${shipClass}`,
    unitType,
    scanResult,
    scanReport,
    recentForumPosts,
    factions,
  };
}
