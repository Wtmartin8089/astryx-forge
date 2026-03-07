/**
 * formatComputerResponse.js
 * Formats command results as Starfleet computer output.
 * Neutral, concise, factual — never invents data.
 */

const HEADER = "## STARFLEET COMPUTER\n\n";

/**
 * @param {object} result  Output from executeComputerCommand()
 * @returns {string}  Formatted plain-text response
 */
export function formatComputerResponse(result) {
  if (!result) return HEADER + "No data available.";

  switch (result.type) {
    case "nearby_systems":
      return formatNearbySystems(result);

    case "scan_system":
      return formatScanSystem(result);

    case "system_information":
      return formatSystemInformation(result);

    case "plot_course":
      return formatPlotCourse(result);

    case "mission_report":
      return formatMissionReport(result);

    case "archive_search":
      return formatArchiveSearch(result);

    case "ship_status":
      return formatShipStatus(result);

    case "unknown":
    default:
      return (
        HEADER +
        "Unable to determine request. Please specify command.\n\n" +
        "Supported commands: nearby systems · scan system · plot course · " +
        "mission report · archive search · ship status"
      );
  }
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatScanSystem({ report, scanType }) {
  // report already contains full Starfleet-voice text from generateScanReport
  const clarity = {
    clear:     "SENSOR CLARITY: FULL RESOLUTION",
    partial:   "SENSOR CLARITY: PARTIAL",
    distorted: "SENSOR CLARITY: DISTORTED",
    none:      "SENSOR CLARITY: NO SIGNAL",
  }[scanType] ?? "";

  return HEADER + (clarity ? `${clarity}\n\n` : "") + report;
}

function formatNearbySystems({ discovered, frontier, total }) {
  if (total === 0) {
    return HEADER + "No systems charted. Initialize campaign map to begin exploration.";
  }

  let out = HEADER;
  out += `${total} star system${total !== 1 ? "s" : ""} detected in campaign sector.\n\n`;

  if (discovered.length > 0) {
    out += `CHARTED SYSTEMS (${discovered.length}):\n`;
    discovered.forEach((name) => { out += `  • ${name}\n`; });
    out += "\n";
  }

  if (frontier > 0) {
    out += `UNEXPLORED SYSTEMS: ${frontier} frontier system${frontier !== 1 ? "s" : ""} await exploration.\n`;
  }

  return out.trim();
}

function formatSystemInformation({ found, name, details, x, y, target }) {
  if (!found) {
    const ref = target ? `"${target}"` : "specified system";
    return HEADER + `No data found for ${ref}. System may be uncharted or undiscovered.`;
  }

  let out = HEADER;
  out += `SYSTEM: ${name}  [${x}, ${y}]\n\n`;

  if (!details) {
    out += "Detailed sensor data unavailable. System requires active scan.";
    return out.trim();
  }

  if (details.starType)    out += `STAR TYPE:    ${details.starType}\n`;
  if (details.planetCount != null) out += `PLANETS:      ${details.planetCount}\n`;
  if (details.anomaly)     out += `\nANOMALY:\n${details.anomaly}\n`;
  if (details.missionHook) out += `\nINTELLIGENCE:\n${details.missionHook}\n`;

  return out.trim();
}

function formatPlotCourse({ target }) {
  if (!target || target === "destination not specified") {
    return HEADER + "Plot course — destination not specified. Please provide a target system or coordinates.";
  }
  return (
    HEADER +
    `Plotting course to ${target}.\n\n` +
    "Navigation solution calculated. Awaiting helm confirmation."
  );
}

function formatMissionReport({ missions }) {
  let out = HEADER;

  if (!missions || missions.length === 0) {
    return out + "No active missions on record.";
  }

  out += `ACTIVE MISSION LOG — ${missions.length} mission${missions.length !== 1 ? "s" : ""} on record.\n\n`;
  missions.forEach((m, i) => {
    out += `MISSION ${i + 1}: ${m.title}\n`;
    if (m.objective) out += `OBJECTIVE: ${m.objective}\n`;
    out += "\n";
  });

  return out.trim();
}

function formatArchiveSearch({ results, query: searchQuery }) {
  let out = HEADER;

  if (!results || results.length === 0) {
    return out + (searchQuery
      ? `No records found matching "${searchQuery}".`
      : "Archive search returned no results.");
  }

  out += `ARCHIVE SEARCH${searchQuery ? ` — "${searchQuery}"` : ""}:\n\n`;
  results.forEach((title) => { out += `  • ${title}\n`; });

  return out.trim();
}

function formatShipStatus({ found, name, shipClass, missionType }) {
  if (!found) {
    return HEADER + "Vessel records not found. No campaign unit registered to this board.";
  }

  return (
    HEADER +
    `VESSEL STATUS REPORT\n\n` +
    `VESSEL:        ${name}\n` +
    `CLASS:         ${shipClass}\n` +
    `MISSION TYPE:  ${missionType}\n\n` +
    `All primary systems nominal.`
  );
}
