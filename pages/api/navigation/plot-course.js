/**
 * Vercel serverless entry point for POST /api/navigation/plot-course
 * Delegates to the route handler in src/server/navigation/plotCourse.js
 */

import { handlePlotCourse } from "../../../src/server/navigation/plotCourse.js";

export default function handler(req, res) {
  return handlePlotCourse(req, res);
}
