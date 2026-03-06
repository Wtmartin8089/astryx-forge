import { handleAIGenerateMission } from "../../../src/server/routes/aiGenerateMission.js";

export default function handler(req, res) {
  return handleAIGenerateMission(req, res);
}
