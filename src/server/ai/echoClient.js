/**
 * echoClient.js
 * HTTP client for the Echo AI homelab service.
 *
 * Echo exposes Ollama's API surface:
 *   POST ${ECHO_URL}/api/generate        → { response: "..." }
 *   POST ${ECHO_URL}/api/image/generate  → { image_url } or { image_data }
 *
 * Configurable via env:
 *   ECHO_URL   (default https://echo.home)
 *   ECHO_MODEL (default qwen3:14b)
 */

const ECHO_URL = process.env.ECHO_URL ?? "https://echo.home";
const ECHO_MODEL = process.env.ECHO_MODEL ?? "qwen3:14b";
const TIMEOUT_MS = 90_000; // qwen3:14b is slower than llama3
const MAX_RETRIES = 2; // additional attempts after the first
const RETRY_DELAY_MS = 1_000;

/** Thrown when Echo is unreachable so callers can show a specific message. */
export class EchoUnavailableError extends Error {
  constructor(message = "Echo AI generator unavailable.") {
    super(message);
    this.name = "EchoUnavailableError";
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Send a prompt to Echo and return the generated text.
 * Retries on network failure (not on HTTP error responses).
 * @param {string} prompt
 * @returns {Promise<string>}
 */
export async function echoGenerate(prompt) {
  console.log(`[echo] generating: ${prompt.slice(0, 60)}...`);

  let lastNetworkError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response;
    try {
      response = await fetch(`${ECHO_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: ECHO_MODEL,
          prompt,
          stream: false,
        }),
      });
    } catch (err) {
      // Network failure or abort — retry these
      const isTimeout = err.name === "AbortError";
      lastNetworkError = new EchoUnavailableError(
        isTimeout ? "Echo request timed out." : "Echo server is unreachable."
      );
      clearTimeout(timer);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw lastNetworkError;
    } finally {
      clearTimeout(timer);
    }

    // HTTP-level errors are not retried — surface immediately.
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Echo returned ${response.status}: ${body}`);
    }

    const data = await response.json();
    if (!data.response) {
      throw new Error("Echo returned an empty response.");
    }
    return data.response;
  }

  // Should be unreachable, but guard anyway.
  throw lastNetworkError ?? new EchoUnavailableError();
}

/**
 * Request an image from Echo's image generation endpoint.
 * Retries on network failure.
 * @param {string} prompt
 * @param {number} [width=512]
 * @param {number} [height=512]
 * @returns {Promise<{ url: string|null, data: string|null }>}
 */
export async function echoGenerateImage(prompt, width = 512, height = 512) {
  console.log(`[echo] generating image: ${prompt.slice(0, 60)}...`);

  let lastNetworkError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response;
    try {
      response = await fetch(`${ECHO_URL}/api/image/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ prompt, width, height }),
      });
    } catch (err) {
      const isTimeout = err.name === "AbortError";
      lastNetworkError = new EchoUnavailableError(
        isTimeout ? "Echo image request timed out." : "Echo image server is unreachable."
      );
      clearTimeout(timer);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw lastNetworkError;
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Echo image endpoint returned ${response.status}: ${body}`);
    }

    const data = await response.json();
    const url = data.image_url ?? data.url ?? null;
    const imageData = data.image_data ?? data.data ?? null;

    if (!url && !imageData) {
      throw new Error("Echo image endpoint returned neither image_url nor image_data.");
    }

    return { url, data: imageData };
  }

  throw lastNetworkError ?? new EchoUnavailableError();
}
