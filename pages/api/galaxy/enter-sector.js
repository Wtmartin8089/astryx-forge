/**
 * Vercel serverless entry point for POST /api/galaxy/enter-sector
 * Delegates to the route handler in src/server/routes/enterSector.js
 */

import { handleEnterSector } from "../../../src/server/routes/enterSector.js";

export default function handler(req, res) {
  return handleEnterSector(req, res);
}
