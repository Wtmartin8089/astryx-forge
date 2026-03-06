/**
 * ollamaService.js
 * Sends generation requests to the local Ollama server.
 * Server URL is configurable via OLLAMA_HOST env var (default: http://ollama:11434).
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://ollama:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3";
const TIMEOUT_MS = 60_000; // Ollama can be slow on first generation

/**
 * Send a prompt to Ollama and return the generated text.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
export async function generateCampaignIdea(prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
      }),
    });
  } catch (err) {
    // Network failure or abort — surface as a distinct error type
    const isTimeout = err.name === "AbortError";
    throw new OllamaUnavailableError(
      isTimeout ? "Ollama request timed out." : "Ollama server is unreachable."
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Ollama returned ${response.status}: ${body}`);
  }

  const data = await response.json();

  if (!data.response) {
    throw new Error("Ollama returned an empty response.");
  }

  return data.response;
}

/** Thrown when Ollama is unreachable so callers can show a specific message. */
export class OllamaUnavailableError extends Error {
  constructor(message = "AI generator unavailable.") {
    super(message);
    this.name = "OllamaUnavailableError";
  }
}
