/**
 * Vercel serverless entry point for POST /api/archive/edit
 * Delegates to src/server/archive/editEntry.js
 */

import { handleEditEntry } from "../../../src/server/archive/editEntry.js";

export default function handler(req, res) {
  return handleEditEntry(req, res);
}
