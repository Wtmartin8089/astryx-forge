/**
 * commandRouter.js
 * Routes a parsed computer command to the appropriate game system query.
 * All Firestore reads — never invents information.
 */

import {
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
} from "firebase/firestore";
import { getServerDb } from "../firebase/serverDb.js";
import { performSystemScan } from "./scanSystem.js";
import { generateScanReport } from "./generateScanReport.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function db() {
  return getServerDb();
}

async function getSystemsByBoard(boardId) {
  // boardId is a ship/starbase slug — look up the campaign that owns it
  const unitsSnap = await getDocs(
    query(collection(db(), "campaignUnits"), where("name", "==", boardId), limit(1)),
  );
  if (unitsSnap.empty) return { systems: [], campaignId: null };
  const unit = unitsSnap.docs[0].data();
  const campaignId = unit.campaignId;

  const sysSnap = await getDocs(
    query(collection(db(), "systems"), where("campaignId", "==", campaignId)),
  );
  return {
    systems: sysSnap.docs.map((d) => d.data()),
    campaignId,
  };
}

// ── Intent handlers ───────────────────────────────────────────────────────────

async function getNearbySystems(playerContext) {
  const { boardId } = playerContext;
  const { systems } = await getSystemsByBoard(boardId);
  const discovered = systems.filter((s) => s.discovered);
  const frontier   = systems.filter((s) => !s.discovered);

  return {
    type: "nearby_systems",
    discovered: discovered.map((s) => s.name),
    frontier: frontier.length,
    total: systems.length,
  };
}

async function getSystemDetails(playerContext, target) {
  const { boardId } = playerContext;
  const { systems } = await getSystemsByBoard(boardId);

  const match = systems.find(
    (s) =>
      s.discovered &&
      (target
        ? s.name.toLowerCase().includes(target.toLowerCase())
        : s.name !== "Unknown System"),
  );

  if (!match) {
    return { type: "system_information", found: false, target };
  }

  return {
    type: "system_information",
    found: true,
    name: match.name,
    details: match.details ?? null,
    x: match.x,
    y: match.y,
  };
}

async function getMissionReport(playerContext) {
  const { playerId, boardId } = playerContext;

  // Find campaign from board
  const { campaignId } = await getSystemsByBoard(boardId);
  if (!campaignId) return { type: "mission_report", missions: [] };

  const snap = await getDocs(
    query(
      collection(db(), "missions"),
      where("campaignId", "==", campaignId),
      where("status", "==", "active"),
      orderBy("createdAt", "desc"),
      limit(3),
    ),
  );

  return {
    type: "mission_report",
    missions: snap.docs.map((d) => ({
      title:     d.data().missionTitle ?? "Unnamed Mission",
      objective: d.data().objective    ?? "",
    })),
  };
}

async function searchArchive(target) {
  const q = target
    ? query(
        collection(db(), "forumThreads"),
        orderBy("createdAt", "desc"),
        limit(5),
      )
    : query(collection(db(), "forumThreads"), orderBy("createdAt", "desc"), limit(5));

  const snap = await getDocs(q);
  const results = snap.docs
    .map((d) => d.data().title ?? "")
    .filter((t) => !target || t.toLowerCase().includes(target.toLowerCase()));

  return { type: "archive_search", results, query: target };
}

async function getShipStatus(playerContext) {
  const { boardId } = playerContext;
  const snap = await getDocs(
    query(collection(db(), "campaignUnits"), where("name", "==", boardId), limit(1)),
  );
  if (snap.empty) return { type: "ship_status", found: false };

  const unit = snap.docs[0].data();
  return {
    type: "ship_status",
    found: true,
    name: unit.name,
    shipClass: unit.shipClass ?? "Unknown",
    missionType: unit.missionType ?? "Unassigned",
  };
}

function plotCourse(target) {
  return {
    type: "plot_course",
    target: target || "destination not specified",
  };
}

// ── Router ────────────────────────────────────────────────────────────────────

/**
 * @param {{ intent: string, target: string }} intentData
 * @param {{ playerId: string, boardId: string }} playerContext
 */
export async function executeComputerCommand(intentData, playerContext) {
  const { intent, target } = intentData;

  switch (intent) {
    case "nearby_systems":
      return getNearbySystems(playerContext);

    case "scan_system": {
      const scanResult = await performSystemScan(playerContext);
      const { scanType, report } = generateScanReport(scanResult);
      return { type: "scan_system", scanType, report, systemId: scanResult.systemId };
    }

    case "system_information":
      return getSystemDetails(playerContext, target);

    case "plot_course":
      return plotCourse(target);

    case "mission_report":
      return getMissionReport(playerContext);

    case "archive_search":
      return searchArchive(target);

    case "ship_status":
      return getShipStatus(playerContext);

    default:
      return { type: "unknown" };
  }
}
