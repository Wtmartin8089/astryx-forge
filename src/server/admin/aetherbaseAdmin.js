import { randomBytes, timingSafeEqual } from "node:crypto";

const CSRF_COOKIE = "astryx_admin_csrf";
const AUTH_COOKIES = ["access_token", "refresh_token"];

export class AdminProxyError extends Error {
  constructor(status, message, code = "request_failed") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index < 0
          ? [part, ""]
          : [part.slice(0, index), part.slice(index + 1)];
      }),
  );
}

function forwardedCookies(headers) {
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const cookie = headers.get("set-cookie");
  return cookie ? cookie.split(/,(?=\s*[^;,]+=)/) : [];
}

export function appendSetCookies(res, cookies) {
  if (!cookies.length) return;
  const current = res.getHeader("Set-Cookie");
  const values = current ? (Array.isArray(current) ? current : [current]) : [];
  res.setHeader("Set-Cookie", [...values, ...cookies]);
}

function cookieAttributes(req, maxAge, httpOnly) {
  const forwardedProto = String(
    req.headers["x-forwarded-proto"] || "http",
  ).split(",")[0].trim();
  return [
    "Path=/",
    `Max-Age=${maxAge}`,
    "SameSite=Lax",
    ...(httpOnly ? ["HttpOnly"] : []),
    ...(forwardedProto === "https" ? ["Secure"] : []),
  ].join("; ");
}

export function ensureCsrfToken(req, res) {
  const existing = parseCookies(req.headers.cookie)[CSRF_COOKIE];
  if (existing && /^[a-f0-9]{48}$/.test(existing)) return existing;

  const token = randomBytes(24).toString("hex");
  appendSetCookies(res, [
    `${CSRF_COOKIE}=${token}; ${cookieAttributes(req, 60 * 60 * 12, false)}`,
  ]);
  return token;
}

export function clearAuthCookies(req, res) {
  appendSetCookies(
    res,
    AUTH_COOKIES.map(
      (name) => `${name}=; ${cookieAttributes(req, 0, true)}`,
    ),
  );
}

export function requestIsSameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || "http";
  if (typeof origin !== "string" || typeof host !== "string") return false;

  try {
    const parsed = new URL(origin);
    return (
      parsed.host.toLowerCase() === String(host).split(",")[0].trim().toLowerCase() &&
      `${parsed.protocol.slice(0, -1)}` === String(protocol).split(",")[0].trim()
    );
  } catch {
    return false;
  }
}

export function assertCsrf(req) {
  const cookie = parseCookies(req.headers.cookie)[CSRF_COOKIE] || "";
  const header = req.headers["x-astryx-csrf"] || "";
  const cookieBytes = Buffer.from(cookie);
  const headerBytes = Buffer.from(typeof header === "string" ? header : "");
  if (
    !requestIsSameOrigin(req) ||
    typeof header !== "string" ||
    !/^[a-f0-9]{48}$/.test(cookie) ||
    !/^[a-f0-9]{48}$/.test(header) ||
    cookieBytes.length !== headerBytes.length ||
    !timingSafeEqual(cookieBytes, headerBytes)
  ) {
    throw new AdminProxyError(403, "Request verification failed.", "csrf_failed");
  }
}

function getBaseUrl() {
  const value = process.env.AETHERBASE_API_URL?.trim();
  if (!value) {
    throw new AdminProxyError(
      503,
      "Player administration is not configured for this installation.",
      "not_configured",
    );
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new AdminProxyError(503, "Player administration is unavailable.", "not_configured");
  }
  const localHttpHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const integrationApi = process.env.NODE_ENV === "integration" && url.hostname === "aetherbase";
  if (
    !new Set(["http:", "https:"]).has(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol === "http:" && !localHttpHosts.has(url.hostname) && !integrationApi)
  ) {
    throw new AdminProxyError(503, "Player administration is unavailable.", "not_configured");
  }
  return url.href.replace(/\/$/, "");
}

export async function callAetherbase(path, { method = "GET", body, cookie } = {}) {
  const baseUrl = getBaseUrl();
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;

  let response;
  try {
    response = await fetch(`${baseUrl}/api/v1/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new AdminProxyError(503, "Aetherbase is temporarily unavailable.", "upstream_unavailable");
  }

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new AdminProxyError(502, "Aetherbase returned an invalid response.", "upstream_invalid");
  }
  return {
    status: response.status,
    payload,
    data: payload?.data ?? payload,
    setCookies: forwardedCookies(response.headers),
  };
}

export function isAdminUser(user) {
  const platformAdminId = process.env.ASTRYX_PLATFORM_ADMIN_USER_ID?.trim();
  return Boolean(
    platformAdminId && user && user.id === platformAdminId &&
    user.is_active !== false && user.is_admin === true
  );
}

export function safeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    is_admin: user.is_admin === true,
    is_active: user.is_active !== false,
    must_change_password: user.must_change_password === true,
  };
}

export function safeErrorMessage(status, fallback = "The request could not be completed.") {
  if (status === 401) return "Your Aetherbase administrator session has expired. Sign in again.";
  if (status === 403) return "Administrator access is required for this action.";
  if (status === 404) return "The requested player or audit record was not found.";
  if (status === 409) {
    return "This action would disable the last active administrator. Another active administrator must remain.";
  }
  if (status === 422) return "Check the selected reason and suspension expiry.";
  return fallback;
}
