/**
 * medalEngine.js
 * Medal and ribbon system for recognizing player achievements.
 *
 * Manages a two-layer medal system:
 *   medals       — catalog of all available medals/ribbons (Firestore or in-memory)
 *   playerMedals — awards granted to specific players
 *
 * Firestore collections:
 *   medals        Optional: persist custom medals beyond the built-in catalog
 *   playerMedals  One document per award (player can receive the same medal multiple times)
 *
 * Display order (for player profile rendering):
 *   1. Major medals      — highest distinction
 *   2. Achievement medals
 *   3. Service ribbons
 *
 * ── Integration ────────────────────────────────────────────────────────────────
 *   import { awardMedal, getPlayerMedals } from "../medals/medalEngine.js";
 *
 *   // After a player completes a first contact:
 *   await awardMedal(playerId, "MEDAL_FIRST_CONTACT", "Initiated first diplomatic contact with the Voriani.", stardate, awardedByShipId);
 *
 *   // On profile load:
 *   const { major, achievement, ribbon } = await getPlayerMedals(playerId);
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { getServerDb } from "../firebase/serverDb.js";
import { getCurrentStardate } from "../time/timeEngine.js";

// ─── Medal categories ─────────────────────────────────────────────────────────

export const MEDAL_CATEGORIES = ["major_medal", "achievement_medal", "service_ribbon"];

/** Display order for profile rendering — major medals first. */
export const CATEGORY_DISPLAY_ORDER = {
  major_medal:       0,
  achievement_medal: 1,
  service_ribbon:    2,
};

// ─── Built-in medal catalog ───────────────────────────────────────────────────
// Stored in memory so the game works without seeding a Firestore medals collection.
// Custom medals can be added to Firestore and will be merged at award time.

export const MEDAL_CATALOG = {
  // ── Major medals ──────────────────────────────────────────────────────────
  MEDAL_OF_HONOR: {
    id:          "MEDAL_OF_HONOR",
    name:        "Medal of Honor",
    category:    "major_medal",
    description: "Starfleet's highest decoration. Awarded for conspicuous gallantry and intrepidity at risk of life above and beyond the call of duty.",
    imageUrl:    null,
    xpBonus:     500,
  },
  CHRISTOPHER_PIKE_MEDAL: {
    id:          "CHRISTOPHER_PIKE_MEDAL",
    name:        "Christopher Pike Medal of Valor",
    category:    "major_medal",
    description: "Awarded for acts of unusual bravery or self-sacrifice in the course of duty.",
    imageUrl:    null,
    xpBonus:     350,
  },
  EXTENDED_TOUR_RIBBON: {
    id:          "EXTENDED_TOUR_RIBBON",
    name:        "Extended Tour Ribbon",
    category:    "major_medal",
    description: "Awarded for exemplary service during an extended deep-space mission lasting more than one year.",
    imageUrl:    null,
    xpBonus:     200,
  },

  // ── Achievement medals ─────────────────────────────────────────────────────
  MEDAL_FIRST_CONTACT: {
    id:          "MEDAL_FIRST_CONTACT",
    name:        "First Contact Commendation",
    category:    "achievement_medal",
    description: "Awarded for successfully establishing first contact with a previously unknown civilization.",
    imageUrl:    null,
    xpBonus:     150,
  },
  MEDAL_EXPLORATION: {
    id:          "MEDAL_EXPLORATION",
    name:        "Exploration Citation",
    category:    "achievement_medal",
    description: "Awarded for charting a previously unmapped sector of space.",
    imageUrl:    null,
    xpBonus:     100,
  },
  MEDAL_SCIENCE: {
    id:          "MEDAL_SCIENCE",
    name:        "Cochrane Medal of Excellence",
    category:    "achievement_medal",
    description: "Awarded for a significant scientific discovery or breakthrough.",
    imageUrl:    null,
    xpBonus:     120,
  },
  MEDAL_COMBAT: {
    id:          "MEDAL_COMBAT",
    name:        "Combat Action Ribbon",
    category:    "achievement_medal",
    description: "Awarded to crew who engaged in direct combat operations against a hostile force.",
    imageUrl:    null,
    xpBonus:     80,
  },
  MEDAL_RESCUE: {
    id:          "MEDAL_RESCUE",
    name:        "Lifesaving Commendation",
    category:    "achievement_medal",
    description: "Awarded for saving the life of one or more individuals at personal risk.",
    imageUrl:    null,
    xpBonus:     100,
  },
  MEDAL_DIPLOMACY: {
    id:          "MEDAL_DIPLOMACY",
    name:        "Diplomatic Corps Citation",
    category:    "achievement_medal",
    description: "Awarded for outstanding service in diplomatic negotiations.",
    imageUrl:    null,
    xpBonus:     90,
  },

  // ── Service ribbons ────────────────────────────────────────────────────────
  RIBBON_DEEP_SPACE: {
    id:          "RIBBON_DEEP_SPACE",
    name:        "Deep Space Service Ribbon",
    category:    "service_ribbon",
    description: "Awarded for completing a tour of duty in deep space, beyond the borders of known Federation space.",
    imageUrl:    null,
    xpBonus:     50,
  },
  RIBBON_STARBASE: {
    id:          "RIBBON_STARBASE",
    name:        "Starbase Service Ribbon",
    category:    "service_ribbon",
    description: "Awarded for completing a tour of duty assigned to a starbase.",
    imageUrl:    null,
    xpBonus:     30,
  },
  RIBBON_CAMPAIGN: {
    id:          "RIBBON_CAMPAIGN",
    name:        "Campaign Service Ribbon",
    category:    "service_ribbon",
    description: "Awarded for participation in a recognized Starfleet campaign.",
    imageUrl:    null,
    xpBonus:     40,
  },
  RIBBON_MEDICAL: {
    id:          "RIBBON_MEDICAL",
    name:        "Medical Service Ribbon",
    category:    "service_ribbon",
    description: "Awarded for outstanding service in the medical field during a mission.",
    imageUrl:    null,
    xpBonus:     35,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function db() { return getServerDb(); }

/**
 * Resolve a medal definition by ID.
 * Checks the in-memory catalog first, then falls back to Firestore `medals` collection.
 *
 * @param {string} medalId
 * @returns {Promise<object>}
 * @throws  Error with .status 404 if not found in either location
 */
async function resolveMedal(medalId) {
  // In-memory catalog (fastest path)
  if (MEDAL_CATALOG[medalId]) return MEDAL_CATALOG[medalId];

  // Custom medals stored in Firestore
  const snap = await getDoc(doc(db(), "medals", medalId));
  if (snap.exists()) return { id: snap.id, ...snap.data() };

  throw Object.assign(
    new Error(`Medal "${medalId}" not found. Check MEDAL_CATALOG keys or Firestore medals collection.`),
    { status: 404 },
  );
}

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Award a medal or ribbon to a player.
 *
 * Resolves medal definition, fetches current stardate from the global time engine,
 * and persists the award to playerMedals. A player can receive the same medal
 * multiple times (e.g. multiple first contacts) — each is a separate record.
 *
 * @param {string}  playerId    Receiving player's ID
 * @param {string}  medalId     Key from MEDAL_CATALOG or Firestore medals doc ID
 * @param {string}  citation    Specific narrative describing the act being recognized
 * @param {number}  [stardate]  Defaults to current universal stardate
 * @param {string}  [awardedBy] Player or officer ID granting the award (null = system)
 * @param {string}  [campaignId]
 * @returns {Promise<{ award: object, medal: object, xpBonus: number }>}
 * @throws  Error with .status 400 | 404
 */
export async function awardMedal(playerId, medalId, citation, stardate = null, awardedBy = null, campaignId = null) {
  if (!playerId || typeof playerId !== "string") throw Object.assign(new Error("playerId is required."), { status: 400 });
  if (!medalId  || typeof medalId  !== "string") throw Object.assign(new Error("medalId is required."),  { status: 400 });
  if (!citation || typeof citation !== "string" || !citation.trim()) throw Object.assign(new Error("citation is required."), { status: 400 });

  // Resolve medal definition
  const medal = await resolveMedal(medalId);

  // Fetch universal stardate if not provided
  if (stardate === null) {
    try {
      stardate = await getCurrentStardate();
    } catch (err) {
      console.warn("[medalEngine] Time engine unavailable:", err.message);
      stardate = 53100.0;
    }
  }

  const now = new Date().toISOString();
  const award = {
    playerId,
    medalId,
    awardedBy:  awardedBy ?? null,
    stardate:   parseFloat(stardate.toFixed(1)),
    citation:   citation.trim(),
    campaignId,
    // Denormalized for efficient profile queries without a medals join
    medalName:     medal.name,
    medalCategory: medal.category,
    xpBonus:       medal.xpBonus ?? 0,
    awardedAt:     now,
  };

  const ref = await addDoc(collection(db(), "playerMedals"), award);
  return { award: { id: ref.id, ...award }, medal, xpBonus: medal.xpBonus ?? 0 };
}

/**
 * Retrieve all medals and ribbons for a player, grouped by category.
 *
 * Results are sorted for profile display:
 *   major medals → achievement medals → service ribbons
 * Within each group, sorted by stardate descending (newest first).
 *
 * @param {string}  playerId
 * @param {string}  [campaignId]  If provided, returns only awards from this campaign
 * @returns {Promise<{
 *   major:       object[],   — major_medal awards
 *   achievement: object[],   — achievement_medal awards
 *   ribbon:      object[],   — service_ribbon awards
 *   total:       number,
 *   totalXp:     number,
 * }>}
 */
export async function getPlayerMedals(playerId, campaignId = null) {
  if (!playerId || typeof playerId !== "string") throw Object.assign(new Error("playerId is required."), { status: 400 });

  const constraints = [
    where("playerId", "==", playerId),
    orderBy("stardate", "desc"),
  ];
  if (campaignId) constraints.splice(1, 0, where("campaignId", "==", campaignId));

  const snap = await getDocs(query(collection(db(), "playerMedals"), ...constraints));
  const awards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const major       = awards.filter((a) => a.medalCategory === "major_medal");
  const achievement = awards.filter((a) => a.medalCategory === "achievement_medal");
  const ribbon      = awards.filter((a) => a.medalCategory === "service_ribbon");
  const totalXp     = awards.reduce((sum, a) => sum + (a.xpBonus ?? 0), 0);

  return { major, achievement, ribbon, total: awards.length, totalXp };
}

/**
 * Add a custom medal to the Firestore medals collection.
 * Use for campaign-specific awards that aren't in the built-in catalog.
 *
 * @param {object} params
 * @param {string}  params.id          Custom medal ID (becomes the Firestore doc ID)
 * @param {string}  params.name
 * @param {string}  params.category    One of MEDAL_CATEGORIES
 * @param {string}  params.description
 * @param {number}  [params.xpBonus]
 * @param {string}  [params.imageUrl]
 * @param {string}  [params.campaignId]
 * @returns {Promise<object>}
 * @throws  Error with .status 400 | 409
 */
export async function createCustomMedal({ id, name, category, description, xpBonus = 0, imageUrl = null, campaignId = null }) {
  if (!id          || typeof id          !== "string") throw Object.assign(new Error("id is required."),          { status: 400 });
  if (!name        || typeof name        !== "string") throw Object.assign(new Error("name is required."),        { status: 400 });
  if (!description || typeof description !== "string") throw Object.assign(new Error("description is required."), { status: 400 });
  if (!MEDAL_CATEGORIES.includes(category)) {
    throw Object.assign(new Error(`category must be one of: ${MEDAL_CATEGORIES.join(", ")}.`), { status: 400 });
  }
  if (MEDAL_CATALOG[id]) {
    throw Object.assign(new Error(`"${id}" is a built-in medal ID and cannot be overwritten.`), { status: 409 });
  }

  const ref  = doc(db(), "medals", id);
  const snap = await getDoc(ref);
  if (snap.exists()) throw Object.assign(new Error(`Medal "${id}" already exists.`), { status: 409 });

  const medal = { id, name: name.trim(), category, description: description.trim(), xpBonus, imageUrl, campaignId };
  const { setDoc } = await import("firebase/firestore");
  await setDoc(ref, medal);
  return medal;
}
