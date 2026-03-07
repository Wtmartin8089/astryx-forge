/**
 * Vercel serverless entry point for POST /api/scan/system
 * Delegates to the route handler in src/server/routes/scanSystem.js
 */

import { handleScanSystem } from "../../../src/server/routes/scanSystem.js";

export default function handler(req, res) {
  return handleScanSystem(req, res);
}
