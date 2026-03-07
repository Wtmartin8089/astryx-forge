/**
 * generateScanReport.js
 * Generates a Starfleet computer scan report based on sensor clarity.
 * Reports give hints only — never the full system details.
 */

const SCAN_PREAMBLE = {
  clear:     "Long-range scan complete. Sensors operating at full resolution.",
  partial:   "Long-range scan complete. Partial sensor resolution. Some interference detected.",
  distorted: "Long-range scan complete. Significant subspace interference. Data reliability compromised.",
  none:      "Long-range scan initiated. Sensor array unable to resolve target. Signal lost.",
};

// Randomised hint fragments per clarity level
const CLEAR_BODIES = [
  "A stable star system with multiple planetary bodies detected.",
  "Sensors confirm a primary star with at least three orbital bodies.",
  "A well-defined star system detected. Orbital mechanics consistent with planetary formation.",
];

const PARTIAL_BODIES = [
  "Sensors detect multiple planetary bodies. Exact count unconfirmed.",
  "Partial resolution — energy readings suggest planetary mass concentrations.",
  "Multiple gravitational signatures detected. Planetary bodies likely.",
];

const DISTORTED_BODIES = [
  "Sensor data fragmented. Possible stellar object in target region.",
  "Subspace interference limits resolution. Mass readings inconclusive.",
  "Intermittent contact. Magnetic field anomaly obscuring full scan.",
];

const ANOMALY_HINTS = {
  clear: [
    "No anomalous readings detected.",
    "Electromagnetic signature within normal parameters.",
    "Trace tetryonic particles detected — origin unknown.",
  ],
  partial: [
    "Unusual energy fluctuations at the periphery of the system.",
    "Faint tachyon emissions — source unresolved.",
    "Subspace variance detected. Further investigation recommended.",
  ],
  distorted: [
    "Sensor interference suggests an active energy source in the region.",
    "Unknown radiation pattern disrupting long-range array.",
    "Distortion field of unknown origin detected.",
  ],
  none: [
    "Sensor array returned no actionable data.",
  ],
};

const RECOMMENDATION = {
  clear:     "Recommend direct approach for full system survey.",
  partial:   "Recommend close-range scan for full system analysis. Further investigation recommended.",
  distorted: "Recommend caution. Navigate to short-range sensor distance for reliable data.",
  none:      "Recommend repositioning to alternative vector. System may be shielded or obscured.",
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a scan report from sensor scan result data.
 *
 * @param {{
 *   scanType: "clear"|"partial"|"distorted"|"none",
 *   systemCoords: { x: number, y: number }|null,
 *   distanceFromBase: number|null,
 *   totalFrontier: number
 * }} scanResult
 * @returns {{ scanType: string, report: string }}
 */
export function generateScanReport(scanResult) {
  const { scanType, systemCoords, distanceFromBase, totalFrontier } = scanResult;

  // Fallback for no-data case
  if (scanType === "none" || !systemCoords) {
    return {
      scanType: "none",
      report:
        "Long-range scan initiated. No resolvable targets detected within sensor range. " +
        "All frontier systems are outside current sensor array capability.",
    };
  }

  const coordStr = `[${systemCoords.x}, ${systemCoords.y}]`;
  const distStr  = distanceFromBase != null ? `${distanceFromBase} light-years from base` : "";

  let bodyHints;
  if      (scanType === "clear")     bodyHints = pick(CLEAR_BODIES);
  else if (scanType === "partial")   bodyHints = pick(PARTIAL_BODIES);
  else                               bodyHints = pick(DISTORTED_BODIES);

  const anomalyHint = pick(ANOMALY_HINTS[scanType] ?? ANOMALY_HINTS.none);
  const recommendation = RECOMMENDATION[scanType];

  const parts = [
    SCAN_PREAMBLE[scanType] ?? SCAN_PREAMBLE.partial,
    ``,
    `TARGET VECTOR: ${coordStr}${distStr ? `  —  ${distStr}` : ""}`,
    ``,
    bodyHints,
    anomalyHint,
    ``,
    recommendation,
  ];

  if (totalFrontier > 1) {
    parts.push(``, `${totalFrontier - 1} additional unexplored system${totalFrontier - 1 !== 1 ? "s" : ""} remain within campaign sector.`);
  }

  return {
    scanType,
    report: parts.join("\n"),
  };
}
