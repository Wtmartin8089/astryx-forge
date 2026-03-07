/**
 * Vercel serverless entry point for GET /api/archive/search
 * Delegates to src/server/archive/searchArchive.js
 */

import { handleSearchArchive } from "../../../src/server/archive/searchArchive.js";

export default function handler(req, res) {
  return handleSearchArchive(req, res);
}
