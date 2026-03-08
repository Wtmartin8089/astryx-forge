import { getMemory, updateMemory } from "./computerMemory";

export type CommandAction =
  | "scanSector"
  | "analyzeAnomaly"
  | "compareArchive"
  | "showCrew"
  | "shipStatus"
  | "missionReport"
  | "unknown";

export async function executeCommand(action: CommandAction, data: { shipId: string }) {
  const memory = getMemory(data.shipId);

  switch (action) {
    case "scanSector": {
      const scan = memory.lastResult ?? { type: "scan_system", report: "Scan complete." };

      updateMemory(data.shipId, {
        lastCommand: "scan",
        lastResult: scan,
        lastContext: "anomalyScan",
      });

      return scan;
    }

    case "analyzeAnomaly": {
      const analysis = {
        type: "anomaly_analysis",
        source: memory.lastResult,
        summary: "Preliminary anomaly analysis complete.",
      };

      updateMemory(data.shipId, {
        lastCommand: "analyze",
        lastResult: analysis,
        lastContext: "anomalyAnalysis",
      });

      return analysis;
    }

    case "compareArchive":
      return {
        type: "archive_search",
        query: "anomaly",
        results: [],
      };

    default:
      return { type: "unknown", message: "Command not recognized." };
  }
}
