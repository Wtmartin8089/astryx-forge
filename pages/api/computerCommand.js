/**
 * POST /api/computerCommand
 * Processes a Starfleet Computer command and returns a formatted response.
 *
 * Body: { message: string, playerId: string, boardId?: string }
 */

import { detectComputerCommand } from "../../src/server/computerCore/detectComputerCommand.js";
import { parseIntent }           from "../../src/server/computerCore/parseIntent.js";
import { executeComputerCommand } from "../../src/server/computerCore/commandRouter.js";
import { formatComputerResponse } from "../../src/server/computerCore/formatComputerResponse.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, playerId, boardId = "" } = req.body ?? {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message is required." });
  }

  // ── 1. Detect command ──
  const detection = detectComputerCommand(message);
  if (!detection.isComputerCommand) {
    return res.status(400).json({ error: "Not a computer command." });
  }

  // ── 2. Parse intent ──
  const intentData = parseIntent(detection.commandText);

  // ── 3. Execute against game data ──
  let result;
  try {
    result = await executeComputerCommand(intentData, { playerId, boardId });
  } catch (err) {
    console.error("[computerCommand] Router error:", err);
    // Return a graceful computer response rather than a raw error
    result = { type: "unknown" };
  }

  // ── 4. Format as Starfleet computer output ──
  const response = formatComputerResponse(result);

  return res.status(200).json({
    response,
    intent: intentData.intent,
    target: intentData.target,
  });
}
