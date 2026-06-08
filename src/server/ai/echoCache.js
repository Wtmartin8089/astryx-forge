/**
 * echoCache.js
 * Firestore cache layer for Echo-generated content.
 * Prevents duplicate (expensive) Echo calls by storing results keyed
 * by a deterministic cache key.
 */

import { getServerDb } from "../firebase/serverDb.js";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  orderBy,
  getDocs,
  limit,
} from "firebase/firestore";

export const CACHE_COLLECTIONS = {
  npc: "echoNpcs",
  quest: "echoQuests",
  lore: "echoLore",
  item: "echoItems",
  encounter: "echoEncounters",
  faction: "echoFactions",
  image: "echoImages",
};

/**
 * Build a Firestore-safe document ID from arbitrary key parts.
 * Sanitizes to alphanumeric + underscore and truncates to 200 chars.
 * @param {*} parts
 * @returns {string}
 */
export function makeCacheKey(parts) {
  const raw = typeof parts === "string" ? parts : JSON.stringify(parts);
  const sanitized = raw.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return sanitized.slice(0, 200) || "_";
}

function collectionFor(type) {
  const name = CACHE_COLLECTIONS[type];
  if (!name) throw new Error(`Unknown echo cache type: ${type}`);
  return name;
}

/**
 * Look up cached content by type and cache key.
 * @param {string} type
 * @param {string} cacheKey
 * @returns {Promise<object|null>}
 */
export async function getCachedContent(type, cacheKey) {
  const db = getServerDb();
  const docId = makeCacheKey(cacheKey);
  const ref = doc(db, collectionFor(type), docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Store content in the cache.
 * @param {string} type
 * @param {string} cacheKey
 * @param {object} data
 * @param {object} [meta]
 * @returns {Promise<string>} the document ID
 */
export async function setCachedContent(type, cacheKey, data, meta = {}) {
  const db = getServerDb();
  const docId = makeCacheKey(cacheKey);
  const ref = doc(db, collectionFor(type), docId);
  await setDoc(ref, {
    ...data,
    cacheKey: docId,
    generatedAt: new Date().toISOString(),
    ...meta,
  });
  return docId;
}

/**
 * List cached docs of a type, newest first.
 * @param {string} type
 * @param {number} [limitN=20]
 * @returns {Promise<object[]>}
 */
export async function listCachedContent(type, limitN = 20) {
  const db = getServerDb();
  const ref = collection(db, collectionFor(type));
  const q = query(ref, orderBy("generatedAt", "desc"), limit(limitN));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
