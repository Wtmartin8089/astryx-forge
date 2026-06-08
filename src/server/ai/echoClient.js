/**
 * echoClient.js
 * HTTP client for the Echo AI homelab service.
 *
 * Echo exposes Ollama's API surface:
 *   POST ${ECHO_URL}/api/generate        → { response: "..." }
 *   POST ${ECHO_URL}/api/image/generate  → { image_url } or { image_data }
 *
 * Required env vars:
 *   ECHO_URL      — Echo base URL (e.g. https://your-tunnel.trycloudflare.com)
 *                   Fallback to https://echo.home for local/homelab use only.
 *
 * Optional env vars:
 *   ECHO_MODEL    — Ollama model name (default: qwen3:14b)
 *   ECHO_API_KEY  — Sent as X-Echo-Api-Key header on every request.
 *                   Required in production. Omit only for trusted local dev.
 */

const ECHO_URL   = process.env.ECHO_URL;
const ECHO_MODEL = process.env.ECHO_MODEL ?? "qwen3:14b";
const ECHO_API_KEY = process.env.ECHO_API_KEY ?? null;

const TIMEOUT_MS    = 90_000; // qwen3:14b is slower than llama3
const MAX_RETRIES   = 2;      // additional attempts after the first
const RETRY_DELAY_MS = 1_000;

if (!ECHO_URL) {
  console.warn(
    "[echo] WARNING: ECHO_URL is not set. Echo AI calls will fail. " +
    "Set ECHO_URL in your .env or Vercel environment variables."
  );
}

if (!ECHO_API_KEY) {
  console.warn(
    "[echo] WARNING: ECHO_API_KEY is not set. Requests will be sent without " +
    "authentication. This is only safe for trusted local development."
  );
}

/** Thrown when Echo is unreachable so callers can show a specific message. */
export class EchoUnavailableError extends Error {
  constructor(message = "Echo AI generator unavailable.") {
    super(message);
    this.name = "EchoUnavailableError";
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Build the request headers, including the API key when configured.
 * @returns {Record<string, string>}
 */
function buildHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (ECHO_API_KEY) {
    headers["X-Echo-Api-Key"] = ECHO_API_KEY;
  }
  return headers;
}

/**
 * Resolve the Echo base URL, throwing immediately if it was never set.
 * @returns {string}
 */
function resolveEchoUrl() {
  const url = ECHO_URL ?? "https://echo.home";
  if (!ECHO_URL) {
    throw new EchoUnavailableError(
      "Echo is not configured: ECHO_URL environment variable is missing."
    );
  }
  return url;
}

/**
 * Send a prompt to Echo and return the generated text.
 * Retries on network failure (not on HTTP error responses).
 * @param {string} prompt
 * @returns {Promise<string>}
 */
export async function echoGenerate(prompt) {
  const baseUrl = resolveEchoUrl();
  console.log(`[echo] generating: ${prompt.slice(0, 60)}...`);

  let lastNetworkError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response;
    try {
      response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: buildHeaders(),
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
        isTimeout
          ? "Echo request timed out. The model may be loading — try again shortly."
          : "Echo server is unreachable. Check ECHO_URL and ensure the tunnel is running."
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
    if (response.status === 401 || response.status === 403) {
      throw new EchoUnavailableError(
        "Echo rejected the request: invalid or missing ECHO_API_KEY."
      );
    }
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
  const baseUrl = resolveEchoUrl();
  console.log(`[echo] generating image: ${prompt.slice(0, 60)}...`);

  let lastNetworkError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response;
    try {
      response = await fetch(`${baseUrl}/api/image/generate`, {
        method: "POST",
        headers: buildHeaders(),
        signal: controller.signal,
        body: JSON.stringify({ prompt, width, height }),
      });
    } catch (err) {
      const isTimeout = err.name === "AbortError";
      lastNetworkError = new EchoUnavailableError(
        isTimeout
          ? "Echo image request timed out. ComfyUI may still be loading."
          : "Echo image server is unreachable. Check ECHO_URL and ensure the tunnel is running."
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

    if (response.status === 401 || response.status === 403) {
      throw new EchoUnavailableError(
        "Echo rejected the image request: invalid or missing ECHO_API_KEY."
      );
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
