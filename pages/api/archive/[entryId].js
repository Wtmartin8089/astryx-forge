/**
 * Vercel serverless entry point for GET /api/archive/:entryId
 * Delegates to src/server/archive/searchArchive.js
 *
 * Vercel injects req.query.entryId from the [entryId] filename.
 */

import { handleGetEntry } from "../../../src/server/archive/searchArchive.js";

export default function handler(req, res) {
  return handleGetEntry(req, res);
}
