/**
 * Vercel serverless entry point for POST /api/scan/sector
 * Delegates to the route handler in src/server/routes/scanSector.js
 */

import { handleScanSector } from "../../../src/server/routes/scanSector.js";

export default function handler(req, res) {
  return handleScanSector(req, res);
}
