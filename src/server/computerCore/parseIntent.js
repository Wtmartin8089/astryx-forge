/**
 * parseIntent.js
 * Keyword-based intent detection for Computer Core commands.
 * No AI required — fast and deterministic.
 */

/**
 * @typedef {"nearby_systems"|"plot_course"|"scan_system"|"system_information"|"mission_report"|"archive_search"|"ship_status"|"unknown"} Intent
 */

/** Each intent maps to a list of keyword patterns. */
const INTENT_PATTERNS = [
  {
    intent: "nearby_systems",
    patterns: [
      /nearby\s+system/i,
      /adjacent\s+system/i,
      /surrounding\s+system/i,
      /what.*(system|sector).*(near|around|close)/i,
      /sensor\s+range/i,
      /systems?\s+in\s+range/i,
    ],
  },
  {
    intent: "plot_course",
    patterns: [
      /plot\s+(a\s+)?course/i,
      /set\s+(a\s+)?course/i,
      /navigate\s+to/i,
      /heading\s+to/i,
      /lay\s+in\s+(a\s+)?course/i,
      /intercept\s+course/i,
      /warp\s+to/i,
    ],
  },
  {
    intent: "scan_system",
    patterns: [
      /scan/i,
      /run\s+(a\s+)?scan/i,
      /analyze/i,
      /full\s+sensor/i,
      /long.range\s+scan/i,
      /detailed\s+scan/i,
    ],
  },
  {
    intent: "system_information",
    patterns: [
      /information\s+(on|about)/i,
      /tell\s+me\s+about/i,
      /data\s+on/i,
      /what\s+(do\s+you\s+know|is)\s+(about|the)/i,
      /records\s+(on|for)/i,
      /details\s+(on|about)/i,
    ],
  },
  {
    intent: "mission_report",
    patterns: [
      /mission\s+report/i,
      /current\s+mission/i,
      /active\s+mission/i,
      /mission\s+status/i,
      /mission\s+briefing/i,
      /our\s+orders/i,
      /standing\s+orders/i,
    ],
  },
  {
    intent: "archive_search",
    patterns: [
      /archive/i,
      /search\s+(the\s+)?(records|database|files|logs)/i,
      /starfleet\s+(records|database|files)/i,
      /historical\s+(records|data)/i,
      /look\s+up/i,
      /find\s+(records|files|data)/i,
    ],
  },
  {
    intent: "ship_status",
    patterns: [
      /ship\s+status/i,
      /vessel\s+status/i,
      /system\s+status/i,
      /warp\s+core\s+status/i,
      /shield\s+status/i,
      /crew\s+status/i,
      /damage\s+report/i,
      /current\s+status/i,
      /report\s+status/i,
    ],
  },
];

/**
 * Extract a target name from the command text.
 * Looks for proper nouns after prepositions or known trigger words.
 * @param {string} text
 * @returns {string}
 */
function extractTarget(text) {
  const targetPatterns = [
    /(?:to|for|on|about|of|at)\s+([A-Z][A-Za-z0-9'\- ]{1,40})/,
    /(?:system|sector|planet|station|vessel)\s+([A-Z][A-Za-z0-9'\- ]{1,40})/i,
    /"([^"]+)"/,
    /'([^']+)'/,
  ];

  for (const pattern of targetPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return "";
}

/**
 * Determine intent and target from a computer command string.
 * @param {string} commandText  The command without the "Computer," prefix.
 * @returns {{ intent: Intent, target: string }}
 */
export function parseIntent(commandText) {
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(commandText))) {
      return { intent, target: extractTarget(commandText) };
    }
  }

  return { intent: "unknown", target: "" };
}
