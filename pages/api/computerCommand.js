/**
 * POST /api/computerCommand
 * Processes a Starfleet Computer command with short-term per-ship memory.
 *
 * Body: {
 *   command?: string,
 *   message?: string,
 *   shipId?: string,
 *   boardId?: string,
 *   playerId?: string
 * }
 */

import { routeCommand } from "../../src/server/computerCore/commandRouter.js";
import { executeCommand } from "../../src/server/computerCore/commandExecutor.js";
import { formatComputerResponse } from "../../src/server/computerCore/formatComputerResponse.js";
import { getMemory } from "../../src/server/computerCore/computerMemory.js";

function normalizeCommand(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";

  // Accept either raw command or prefixed style: "Computer, ..."
  if (raw.toLowerCase().startsWith("computer,")) {
    return raw.slice("computer,".length).trim();
  }

  return raw;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    command,
    message,
    shipId,
    boardId = "",
    playerId = "",
  } = req.body ?? {};

  const commandText = normalizeCommand(command ?? message);
  const resolvedShipId = shipId || boardId;

  if (!commandText) {
    return res.status(400).json({ error: "command is required." });
  }

  if (!resolvedShipId || typeof resolvedShipId !== "string") {
    return res.status(400).json({ error: "shipId is required." });
  }

  const memory = getMemory(resolvedShipId);
  const action = routeCommand(commandText, memory);

  let result;
  try {
    result = await executeCommand(action, {
      shipId: resolvedShipId,
      boardId: boardId || resolvedShipId,
      playerId,
      command: commandText,
    });
  } catch (err) {
    console.error("[computerCommand] Execution error:", err);
    result = { type: "unknown", message: "Computer core execution fault." };
  }

  const response = formatComputerResponse(result);

  return res.status(200).json({
    response,
    action,
    result,
    memory: getMemory(resolvedShipId),
  });
}
