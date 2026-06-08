import { handleDialogue } from "../../../src/server/routes/echo/dialogueRoute.js";

export default function handler(req, res) {
  return handleDialogue(req, res);
}
