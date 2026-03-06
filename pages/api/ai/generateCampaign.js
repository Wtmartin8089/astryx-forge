/**
 * Vercel serverless entry point for POST /api/ai/generateCampaign
 * Delegates to the route handler in src/server/routes/aiGenerateCampaign.js
 */

import { handleAIGenerateCampaign } from "../../../src/server/routes/aiGenerateCampaign.js";

export default function handler(req, res) {
  return handleAIGenerateCampaign(req, res);
}
