/**
 * Vercel serverless entry point for POST /api/archive/create
 * Delegates to src/server/archive/createEntry.js
 */

import { handleCreateEntry } from "../../../src/server/archive/createEntry.js";

export default function handler(req, res) {
  return handleCreateEntry(req, res);
}
