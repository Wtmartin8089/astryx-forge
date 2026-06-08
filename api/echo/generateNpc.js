import { handleNpc } from "../../src/server/routes/echo/npcRoute.js";

export default function handler(req, res) {
  return handleNpc(req, res);
}
