/**
 * Vercel serverless entry point for POST /api/anomaly/scan
 * Delegates to the route handler in src/server/routes/scanAnomaly.js
 */

import { handleScanAnomaly } from "../../../src/server/routes/scanAnomaly.js";

export default function handler(req, res) {
  return handleScanAnomaly(req, res);
}
