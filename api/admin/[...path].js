import {
  AdminProxyError,
  appendSetCookies,
  assertCsrf,
  callAetherbase,
  clearAuthCookies,
  ensureCsrfToken,
  isAdminUser,
  parseCookies,
  safeErrorMessage,
  safeUser,
} from "../../src/server/admin/aetherbaseAdmin.js";

const REASONS = new Set([
  "abuse",
  "harassment",
  "security",
  "spam",
  "terms_violation",
  "other",
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasAuthCookies(cookies) {
  return (
    cookies.some((cookie) => cookie.startsWith("access_token=")) &&
    cookies.some((cookie) => cookie.startsWith("refresh_token="))
  );
}

function send(res, status, data, code, message) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(
    JSON.stringify(
      status >= 400
        ? { success: false, error: { code, message } }
        : { success: true, data, meta: {} },
    ),
  );
}

function noStore(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Cookie");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

function pathParts(req) {
  const raw = req.query?.path;
  return (Array.isArray(raw) ? raw : raw ? [raw] : []).map(String);
}

function queryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function requestBody(req) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      throw new AdminProxyError(400, "Request body must be valid JSON.", "bad_request");
    }
  }
  return req.body && typeof req.body === "object" ? req.body : {};
}

function mappedUpstreamError(result, req, res) {
  if (result.status === 401) clearAuthCookies(req, res);
  const message = safeErrorMessage(result.status);
  send(res, result.status, null, result.status === 401 ? "unauthorized" : result.status === 403 ? "forbidden" : result.status === 409 ? "conflict" : "request_failed", message);
}

async function callMe(cookie) {
  return callAetherbase("auth/me", { cookie });
}

async function currentAdmin(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  if (!cookies.access_token && !cookies.refresh_token) return null;

  const cookie = req.headers.cookie || "";
  const me = await callMe(cookie);
  if (me.status === 401) {
    if (!cookies.refresh_token) clearAuthCookies(req, res);
    return null;
  }
  if (me.status === 403) {
    throw new AdminProxyError(403, "Complete the required Aetherbase password setup before continuing.", "password_setup_required");
  }
  if (me.status !== 200 || !me.data) {
    throw new AdminProxyError(503, "Aetherbase is temporarily unavailable.", "upstream_unavailable");
  }
  if (!isAdminUser(me.data)) {
    return { user: me.data, cookie, isAdmin: false };
  }
  return { user: me.data, cookie, isAdmin: true };
}

async function handleSession(req, res) {
  const csrfToken = req.query?.navigation === "1" ? undefined : ensureCsrfToken(req, res);
  const session = await currentAdmin(req, res);
  if (!session) {
    const cookies = parseCookies(req.headers.cookie);
    return send(res, 200, {
      authenticated: false,
      ...(cookies.refresh_token ? { reason: "session_expired" } : {}),
      ...(csrfToken ? { csrf_token: csrfToken } : {}),
    }, null, null);
  }
  if (!session.isAdmin) {
    return send(res, 200, { authenticated: false, reason: "not_admin", ...(csrfToken ? { csrf_token: csrfToken } : {}) }, null, null);
  }
  return send(res, 200, { authenticated: true, user: safeUser(session.user), ...(csrfToken ? { csrf_token: csrfToken } : {}) }, null, null);
}

async function handleLogin(req, res) {
  assertCsrf(req);
  const { email, password } = requestBody(req);
  if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
    throw new AdminProxyError(422, "Enter your Aetherbase email and password.", "validation_error");
  }

  const result = await callAetherbase("auth/login", {
    method: "POST",
    body: { email: email.trim(), password },
  });
  if (result.status !== 200 || !result.data?.user) {
    const status = result.status >= 500 ? 503 : 401;
    send(res, status, null, status === 401 ? "unauthorized" : "upstream_unavailable", status === 401 ? "Aetherbase sign-in failed. Check your credentials." : "Aetherbase is temporarily unavailable.");
    return;
  }

  const { access_token: accessToken, refresh_token: refreshToken, user } = result.data;
  if (!isAdminUser(user) || user.must_change_password) {
    if (refreshToken) {
      await callAetherbase("auth/logout", {
        method: "POST",
        body: { refresh_token: refreshToken },
      }).catch(() => null);
    }
    clearAuthCookies(req, res);
    send(
      res,
      403,
      null,
      "forbidden",
      user.must_change_password
        ? "Complete the required Aetherbase password setup before continuing."
        : "This Aetherbase account is not an administrator.",
    );
    return;
  }

  if (!accessToken || !refreshToken || !hasAuthCookies(result.setCookies)) {
    if (refreshToken) {
      await callAetherbase("auth/logout", {
        method: "POST",
        body: { refresh_token: refreshToken },
      }).catch(() => null);
    }
    clearAuthCookies(req, res);
    throw new AdminProxyError(502, "Aetherbase could not establish a secure session.", "upstream_invalid");
  }
  appendSetCookies(res, result.setCookies);
  const csrfToken = ensureCsrfToken(req, res);
  send(res, 200, { authenticated: true, user: safeUser(user), csrf_token: csrfToken }, null, null);
}

async function handleLogout(req, res) {
  assertCsrf(req);
  const refreshToken = parseCookies(req.headers.cookie).refresh_token;
  if (refreshToken) {
    await callAetherbase("auth/logout", {
      method: "POST",
      body: { refresh_token: refreshToken },
      cookie: req.headers.cookie || "",
    }).catch(() => null);
  }
  clearAuthCookies(req, res);
  send(res, 200, { status: "ok" }, null, null);
}

async function handleRefresh(req, res) {
  assertCsrf(req);
  const refreshToken = parseCookies(req.headers.cookie).refresh_token;
  if (!refreshToken) {
    clearAuthCookies(req, res);
    return send(res, 401, null, "unauthorized", "Your Aetherbase administrator session has expired. Sign in again.");
  }

  const refreshed = await callAetherbase("auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
    cookie: req.headers.cookie || "",
  });
  appendSetCookies(res, refreshed.setCookies);
  if (
    refreshed.status !== 200 ||
    !refreshed.data?.access_token ||
    !refreshed.data?.refresh_token ||
    !hasAuthCookies(refreshed.setCookies)
  ) {
    clearAuthCookies(req, res);
    return send(res, 401, null, "unauthorized", "Your Aetherbase administrator session has expired. Sign in again.");
  }

  const cookie = `access_token=${refreshed.data.access_token}; refresh_token=${refreshed.data.refresh_token}`;
  const me = await callMe(cookie);
  if (me.status !== 200 || !me.data) {
    clearAuthCookies(req, res);
    return send(res, 401, null, "unauthorized", "Your Aetherbase administrator session has expired. Sign in again.");
  }
  if (!isAdminUser(me.data) || me.data.must_change_password) {
    await callAetherbase("auth/logout", {
      method: "POST",
      body: { refresh_token: refreshed.data.refresh_token },
      cookie,
    }).catch(() => null);
    clearAuthCookies(req, res);
    return send(res, 403, null, "forbidden", "Administrator access is required.");
  }
  return send(res, 200, { authenticated: true, user: safeUser(me.data) }, null, null);
}

function listQuery(req, kind) {
  const params = new URLSearchParams();
  if (kind === "users") {
    const search = queryValue(req.query?.search);
    const status = queryValue(req.query?.status);
    const limit = Number(queryValue(req.query?.limit) || 50);
    const offset = Number(queryValue(req.query?.offset) || 0);
    if (search) params.set("search", String(search).slice(0, 320));
    if (status) {
      if (!["active", "suspended", "banned"].includes(String(status))) {
        throw new AdminProxyError(422, "Choose a valid account status.", "validation_error");
      }
      params.set("status", String(status));
    }
    params.set("limit", String(Number.isInteger(limit) ? Math.min(100, Math.max(1, limit)) : 50));
    params.set("offset", String(Number.isInteger(offset) ? Math.max(0, offset) : 0));
  } else {
    const target = queryValue(req.query?.target_user_id);
    const limit = Number(queryValue(req.query?.limit) || 100);
    const offset = Number(queryValue(req.query?.offset) || 0);
    if (target) {
      if (!UUID.test(String(target))) throw new AdminProxyError(422, "Choose a valid player.", "validation_error");
      params.set("target_user_id", String(target));
    }
    params.set("limit", String(Number.isInteger(limit) ? Math.min(200, Math.max(1, limit)) : 100));
    params.set("offset", String(Number.isInteger(offset) ? Math.max(0, offset) : 0));
  }
  return params.toString();
}

function moderationBody(action, req) {
  const body = requestBody(req);
  if (!REASONS.has(body.reason)) {
    throw new AdminProxyError(422, "Choose a valid moderation reason.", "validation_error");
  }
  if (action !== "suspend") return { reason: body.reason };
  if (typeof body.suspended_until !== "string" || !/(Z|[+-]\d{2}:\d{2})$/i.test(body.suspended_until)) {
    throw new AdminProxyError(422, "Choose a future suspension expiry with a timezone.", "validation_error");
  }
  const expiry = new Date(body.suspended_until);
  if (Number.isNaN(expiry.valueOf()) || expiry.valueOf() <= Date.now()) {
    throw new AdminProxyError(422, "Suspension expiry must be in the future.", "validation_error");
  }
  return { reason: body.reason, suspended_until: expiry.toISOString() };
}

async function proxyAdminRequest(req, res, session, path, body) {
  if (req.method === "POST") assertCsrf(req);
  const result = await callAetherbase(path, {
    method: req.method,
    body,
    cookie: session.cookie,
  });
  appendSetCookies(res, result.setCookies);
  if (result.status !== 200) return mappedUpstreamError(result, req, res);
  return send(res, 200, result.data, null, null);
}

export default async function handler(req, res) {
  noStore(res);
  const [root, id, action, ...extra] = pathParts(req);
  try {
    if (extra.length === 0 && root === "session" && req.method === "GET") return await handleSession(req, res);
    if (extra.length === 0 && root === "login" && req.method === "POST") return await handleLogin(req, res);
    if (extra.length === 0 && root === "logout" && req.method === "POST") return await handleLogout(req, res);
    if (extra.length === 0 && root === "refresh" && req.method === "POST") return await handleRefresh(req, res);

    if (req.method === "GET" && ["users", "audit"].includes(root) && id === undefined) {
      const session = await currentAdmin(req, res);
      if (!session) {
        if (!parseCookies(req.headers.cookie).refresh_token) clearAuthCookies(req, res);
        return send(res, 401, null, "unauthorized", "Your Aetherbase administrator session has expired. Sign in again.");
      }
      if (!session.isAdmin) return send(res, 403, null, "forbidden", "Administrator access is required.");
      const query = listQuery(req, root);
      return await proxyAdminRequest(req, res, session, `admin/${root}${query ? `?${query}` : ""}`);
    }

    if (req.method === "POST" && root === "users" && id && action && extra.length === 0 && UUID.test(id)) {
      if (!["suspend", "ban", "reinstate", "revoke-sessions"].includes(action)) {
        return send(res, 404, null, "not_found", "The requested moderation action was not found.");
      }
      assertCsrf(req);
      const session = await currentAdmin(req, res);
      if (!session) {
        if (!parseCookies(req.headers.cookie).refresh_token) clearAuthCookies(req, res);
        return send(res, 401, null, "unauthorized", "Your Aetherbase administrator session has expired. Sign in again.");
      }
      if (!session.isAdmin) return send(res, 403, null, "forbidden", "Administrator access is required.");
      const backendAction = action === "revoke-sessions" ? "revoke-sessions" : action;
      return await proxyAdminRequest(
        req,
        res,
        session,
        `admin/users/${id}/${backendAction}`,
        moderationBody(action, req),
      );
    }
    return send(res, 404, null, "not_found", "The requested administration route was not found.");
  } catch (error) {
    if (error instanceof AdminProxyError) {
      return send(res, error.status, null, error.code, error.message);
    }
    return send(res, 503, null, "upstream_unavailable", "Aetherbase is temporarily unavailable.");
  }
}

export { currentAdmin, listQuery, moderationBody, pathParts };
