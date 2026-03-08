/**
 * commandRouter.js
 * Stateless command -> action routing.
 */

export function routeCommand(command, memory = {}) {
  const text = String(command || "").toLowerCase();

  if (text.includes("scan")) return "scanSector";

  if (text.includes("analyze") && memory.lastContext === "anomalyScan") {
    return "analyzeAnomaly";
  }

  if (text.includes("compare") && memory.lastContext === "anomalyAnalysis") {
    return "compareArchive";
  }

  if (text.includes("archive") && memory.lastResult) return "compareArchive";
  if (text.includes("crew")) return "showCrew";
  if (text.includes("status")) return "shipStatus";
  if (text.includes("mission")) return "missionReport";

  return "unknown";
}
