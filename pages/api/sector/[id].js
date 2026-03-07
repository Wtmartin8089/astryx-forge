/**
 * Vercel serverless entry point for GET /api/sector/:id
 * Delegates to the route handler in src/server/routes/getSector.js
 *
 * Vercel injects req.query.id from the [id] filename.
 */

import { handleGetSector } from "../../../src/server/routes/getSector.js";

export default function handler(req, res) {
  return handleGetSector(req, res);
}
