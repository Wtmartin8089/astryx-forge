/**
 * loadOrGenerateSector.js
 * Loads a sector from Firestore if it exists, otherwise generates and saves it.
 * Single entry point for all sector access.
 */

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { getServerDb } from "../firebase/serverDb.js";
import { generateSector } from "./generateSector.js";

function db() {
  return getServerDb();
}

/**
 * Checks if a sector already exists in Firestore.
 * @returns {object|null} Sector document data (with id) or null
 */
async function findExistingSector(campaignId, designation) {
  const snap = await getDocs(
    query(
      collection(db(), "sectors"),
      where("campaignId", "==", campaignId),
      where("designation", "==", designation),
      limit(1),
    ),
  );
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/**
 * Saves a generated sector and all its children to Firestore.
 * Returns the saved sector document (with Firestore id).
 */
async function saveSector(campaignId, generated) {
  const { sector, systems, planets, anomalies } = generated;

  // 1. Save sector
  const sectorRef = await addDoc(collection(db(), "sectors"), {
    ...sector,
    campaignId,
    generatedAt: serverTimestamp(),
  });
  const sectorId = sectorRef.id;

  // 2. Save systems (in parallel), capture their IDs
  const systemRefs = await Promise.all(
    systems.map((sys) =>
      addDoc(collection(db(), "systems"), {
        ...sys,
        sectorId,
        campaignId,
      }),
    ),
  );

  // 3. Save planets, binding to their system IDs
  //    systems[i] owns planets from generateSystem slot i
  //    We need to reconstruct which planets belong to which system.
  //    generateSector spreads planets flat — re-assign by orbitalIndex grouping.
  const planetSaveOps = [];
  let planetCursor = 0;
  for (let i = 0; i < systems.length; i++) {
    const systemId  = systemRefs[i].id;
    const pCount    = systems[i].planetCount;
    const slice     = planets.slice(planetCursor, planetCursor + pCount);
    planetCursor   += pCount;

    for (const planet of slice) {
      planetSaveOps.push(
        addDoc(collection(db(), "planets"), {
          ...planet,
          systemId,
          sectorId,
          campaignId,
        }),
      );
    }
  }
  await Promise.all(planetSaveOps);

  // 4. Save anomalies — match to system by index order
  //    anomalies array is sparse (only systems that have one).
  //    generateSector pushes anomalies in system order, so we track by position.
  let anomalySystemIdx = 0;
  const anomalySaveOps = [];
  for (let i = 0; i < systems.length; i++) {
    if (systems[i].anomalyPresent) {
      const anomaly = anomalies[anomalySystemIdx++];
      if (anomaly) {
        anomalySaveOps.push(
          addDoc(collection(db(), "anomalies"), {
            ...anomaly,
            systemId:   systemRefs[i].id,
            sectorId,
            campaignId,
          }),
        );
      }
    }
  }
  await Promise.all(anomalySaveOps);

  return { id: sectorId, ...sector, generatedAt: new Date().toISOString() };
}

/**
 * Load or generate a sector.
 *
 * @param {string} campaignId
 * @param {string} designation  e.g. "DQ-07"
 * @returns {object}  The sector document (Firestore or freshly saved)
 */
export async function loadOrGenerateSector(campaignId, designation) {
  // Fast path: already exists
  const existing = await findExistingSector(campaignId, designation);
  if (existing) return existing;

  // Generate and persist
  const generated = generateSector(campaignId, designation);
  const saved     = await saveSector(campaignId, generated);
  return saved;
}
