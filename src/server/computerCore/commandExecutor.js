/**
 * commandExecutor.js
 * Executes routed computer actions and persists short-term memory context.
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
import { getMemory, updateMemory } from "./computerMemory.js";

function db() {
  return getServerDb();
}

async function getCampaignByBoard(boardId) {
  if (!boardId) return { campaignId: null, unit: null };

  const unitsSnap = await getDocs(
    query(collection(db(), "campaignUnits"), where("name", "==", boardId), limit(1)),
  );

  if (unitsSnap.empty) return { campaignId: null, unit: null };

  const unit = unitsSnap.docs[0].data();
  return { campaignId: unit.campaignId ?? null, unit };
}

function analyze(result) {
  const report = result?.report || "No anomaly telemetry in active memory.";

  return {
    type: "anomaly_analysis",
    summary: "Anomaly pattern matrix processed. Preliminary comparison profile generated.",
    findings: [
      "Subspace variance detected across multiple sensor bands.",
      "Signal coherence indicates non-random structure.",
      "Recommend cross-reference against known anomaly records.",
    ],
    sourceReport: report,
  };
}

async function compareArchive(analysis, target = "") {
  const queryText = String(target || "anomaly").trim().toLowerCase();

  const snap = await getDocs(
    query(collection(db(), "forumThreads"), orderBy("createdAt", "desc"), limit(10)),
  );

  const results = snap.docs
    .map((d) => d.data().title ?? "")
    .filter(Boolean)
    .filter((title) => {
      if (!queryText) return true;
      return title.toLowerCase().includes(queryText);
    });

  return {
    type: "archive_search",
    query: queryText || "anomaly",
    comparedSummary: analysis?.summary ?? null,
    results,
  };
}

async function showCrew(boardId) {
  if (!boardId) {
    return { type: "crew_manifest", shipId: null, crew: [] };
  }

  const snap = await getDocs(
    query(collection(db(), "crew"), where("shipId", "==", boardId), limit(50)),
  );

  const crew = snap.docs.map((d) => {
    const row = d.data();
    return {
      id: d.id,
      name: row.name ?? "Unknown",
      rank: row.rank ?? "Unranked",
      position: row.position ?? "Unassigned",
    };
  });

  return { type: "crew_manifest", shipId: boardId, crew };
}

async function shipStatus(boardId) {
  const { unit } = await getCampaignByBoard(boardId);

  if (!unit) return { type: "ship_status", found: false };

  return {
    type: "ship_status",
    found: true,
    name: unit.name,
    shipClass: unit.shipClass ?? "Unknown",
    missionType: unit.missionType ?? "Unassigned",
  };
}

async function missionReport(boardId) {
  const { campaignId } = await getCampaignByBoard(boardId);
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
      title: d.data().missionTitle ?? "Unnamed Mission",
      objective: d.data().objective ?? "",
    })),
  };
}

export async function executeCommand(action, data) {
  const { shipId, boardId = "", playerId = "", command = "" } = data ?? {};
  const memory = getMemory(shipId);

  switch (action) {
    case "scanSector": {
      const scanResult = await performSystemScan({ playerId, boardId });
      const { scanType, report } = generateScanReport(scanResult);

      const scan = {
        type: "scan_system",
        scanType,
        report,
        systemId: scanResult.systemId,
      };

      updateMemory(shipId, {
        lastCommand: command || "scan",
        lastResult: scan,
        lastContext: "anomalyScan",
      });

      return scan;
    }

    case "analyzeAnomaly": {
      const analysis = analyze(memory.lastResult);

      updateMemory(shipId, {
        lastCommand: command || "analyze",
        lastResult: analysis,
        lastContext: "anomalyAnalysis",
      });

      return analysis;
    }

    case "compareArchive": {
      const compared = await compareArchive(memory.lastResult, "anomaly");

      updateMemory(shipId, {
        lastCommand: command || "compare",
        lastResult: compared,
        lastContext: "archiveComparison",
      });

      return compared;
    }

    case "showCrew": {
      const result = await showCrew(boardId || shipId);
      updateMemory(shipId, {
        lastCommand: command || "crew",
        lastResult: result,
        lastContext: "crewManifest",
      });
      return result;
    }

    case "shipStatus": {
      const result = await shipStatus(boardId || shipId);
      updateMemory(shipId, {
        lastCommand: command || "status",
        lastResult: result,
        lastContext: "shipStatus",
      });
      return result;
    }

    case "missionReport": {
      const result = await missionReport(boardId || shipId);
      updateMemory(shipId, {
        lastCommand: command || "mission",
        lastResult: result,
        lastContext: "missionReport",
      });
      return result;
    }

    case "unknown":
    default:
      return { type: "unknown", message: "Command not recognized." };
  }
}
