/**
 * detectComputerCommand.js
 * Determines whether a forum message is a Starfleet Computer command.
 */

const TRIGGER_PREFIX = "computer,";

/**
 * @param {string} message
 * @returns {{ isComputerCommand: true, commandText: string } | { isComputerCommand: false }}
 */
export function detectComputerCommand(message) {
  if (typeof message !== "string" || !message.trim()) {
    return { isComputerCommand: false };
  }

  const trimmed = message.trim();

  if (trimmed.toLowerCase().startsWith(TRIGGER_PREFIX)) {
    // Strip the trigger prefix and any leading whitespace from the command
    const commandText = trimmed.slice(TRIGGER_PREFIX.length).trim();
    return { isComputerCommand: true, commandText };
  }

  return { isComputerCommand: false };
}
