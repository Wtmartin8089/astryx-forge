/**
 * Vercel serverless entry point for POST /api/survey/system
 * Delegates to the route handler in src/server/routes/surveySystem.js
 */

import { handleSurveySystem } from "../../../src/server/routes/surveySystem.js";

export default function handler(req, res) {
  return handleSurveySystem(req, res);
}
