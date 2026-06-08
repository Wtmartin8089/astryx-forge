import { handleImage } from "../../../src/server/routes/echo/imageRoute.js";

export default function handler(req, res) {
  return handleImage(req, res);
}
