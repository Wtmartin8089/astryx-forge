import { handleQuest } from "../../../src/server/routes/echo/questRoute.js";

export default function handler(req, res) {
  return handleQuest(req, res);
}
