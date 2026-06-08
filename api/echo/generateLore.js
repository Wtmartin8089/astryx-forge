import { handleLore } from "../../src/server/routes/echo/loreRoute.js";

export default function handler(req, res) {
  return handleLore(req, res);
}
