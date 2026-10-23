import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import handler from "../api/admin/[...path].js";

process.env.AETHERBASE_API_URL = "https://aetherbase.test";

function responseRecorder() {
  const headers = new Map();
  return {
    statusCode: 200,
    headers,
    body: "",
    setHeader(name, value) { headers.set(name.toLowerCase(), value); },
    getHeader(name) { return headers.get(name.toLowerCase()); },
    end(body) { this.body = body; },
    json() { return JSON.parse(this.body); },
    cookies() {
      const value = headers.get("set-cookie") || [];
      return Array.isArray(value) ? value : [value];
    },
  };
}

function request(method, url, { body, cookie, csrf = "c".repeat(48), csrfCookie = csrf, origin = "https://astryx.test" } = {}) {
  const parsed = new URL(url, "https://astryx.test");
  const path = parsed.pathname.replace(/^\/api\/admin\/?/, "").split("/").filter(Boolean);
  return {
    method,
    url: `${parsed.pathname}${parsed.search}`,
    body,
    query: {
      path,
      ...Object.fromEntries(parsed.searchParams.entries()),
    },
    headers: {
      host: "astryx.test",
      origin,
      "x-forwarded-proto": "https",
      cookie: [cookie, csrfCookie ? `astryx_admin_csrf=${csrfCookie}` : ""].filter(Boolean).join("; "),
      "x-astryx-csrf": csrf,
    },
  };
}

function invoke(method, url, options) {
  const req = request(method, url, options);
  const res = responseRecorder();
  return handler(req, res).then(() => ({ req, res, body: res.json() }));
}

function upstream(status, data, setCookies = []) {
  const headers = new Headers({ "Content-Type": "application/json" });
  for (const cookie of setCookies) headers.append("Set-Cookie", cookie);
  return new Response(JSON.stringify({ success: status < 400, data, error: status >= 400 ? data : undefined }), { status, headers });
}

const admin = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  email: "captain@example.test",
  display_name: "Captain",
  is_admin: true,
  is_active: true,
  must_change_password: false,
};
const player = { ...admin, id: "223e4567-e89b-42d3-a456-426614174000", is_admin: false };
const authCookies = "access_token=access-secret; refresh_token=refresh-secret";
const csrf = "a".repeat(48);

test("unauthenticated player-list requests are rejected without contacting Aetherbase", async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error("unexpected"); };
  const { res, body } = await invoke("GET", "/api/admin/users");
  assert.equal(res.statusCode, 401);
  assert.equal(body.error.code, "unauthorized");
  assert.equal(called, false);
  assert.equal(res.getHeader("cache-control"), "no-store");
});

test("session endpoint provisions a CSRF token without exposing auth tokens", async () => {
  globalThis.fetch = async () => { throw new Error("must not call upstream without an auth cookie"); };
  const { res, body } = await invoke("GET", "/api/admin/session", { csrf: "" });
  assert.equal(body.data.authenticated, false);
  assert.match(body.data.csrf_token, /^[a-f0-9]{48}$/);
  assert.ok(res.cookies().some((cookie) => cookie.startsWith("astryx_admin_csrf=")));
  assert.equal(JSON.stringify(body).includes("access_token"), false);
});

test("player Aetherbase sign-in is rejected and the new refresh session is logged out", async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith("/api/v1/auth/login")) {
      return upstream(200, { access_token: "private-access", refresh_token: "private-refresh", user: player }, [
        "access_token=private-access; Path=/; HttpOnly; Secure; SameSite=Lax",
        "refresh_token=private-refresh; Path=/; HttpOnly; Secure; SameSite=Lax",
      ]);
    }
    if (String(url).endsWith("/api/v1/auth/logout")) return upstream(200, { status: "ok" });
    throw new Error("unexpected upstream path");
  };

  const { res, body } = await invoke("POST", "/api/admin/login", {
    body: { email: player.email, password: "do-not-return" },
    csrf,
  });
  assert.equal(res.statusCode, 403);
  assert.equal(body.error.code, "forbidden");
  assert.equal(calls.length, 2);
  assert.equal(JSON.stringify(body).includes("private-access"), false);
  assert.equal(JSON.stringify(body).includes("private-refresh"), false);
  assert.ok(res.cookies().some((cookie) => cookie.startsWith("access_token=;")));
});

test("administrator sign-in keeps tokens only in HttpOnly cookies", async () => {
  globalThis.fetch = async (url) => {
    assert.equal(String(url), "https://aetherbase.test/api/v1/auth/login");
    return upstream(200, { access_token: "private-access", refresh_token: "private-refresh", user: admin }, [
      "access_token=private-access; Path=/; HttpOnly; Secure; SameSite=Lax",
      "refresh_token=private-refresh; Path=/; HttpOnly; Secure; SameSite=Lax",
    ]);
  };

  const { res, body } = await invoke("POST", "/api/admin/login", {
    body: { email: admin.email, password: "private-password" },
    csrf,
  });
  assert.equal(res.statusCode, 200);
  assert.equal(body.data.authenticated, true);
  assert.equal(body.data.user.email, admin.email);
  assert.equal(JSON.stringify(body).includes("private-access"), false);
  assert.equal(JSON.stringify(body).includes("private-refresh"), false);
  assert.ok(res.cookies().some((cookie) => cookie.startsWith("access_token=private-access") && /HttpOnly/i.test(cookie)));
  assert.ok(res.cookies().some((cookie) => cookie.startsWith("refresh_token=private-refresh") && /HttpOnly/i.test(cookie)));
});

test("ordinary Aetherbase players cannot query the administration API", async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return upstream(200, player);
  };
  const { res, body } = await invoke("GET", "/api/admin/users", { cookie: authCookies, csrf });
  assert.equal(res.statusCode, 403);
  assert.equal(body.error.code, "forbidden");
  assert.equal(calls.length, 1);
  assert.match(calls[0], /auth\/me$/);
});

test("player search and filtering use only the existing Aetherbase list contract", async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).endsWith("/api/v1/auth/me")) return upstream(200, admin);
    return upstream(200, { users: [], total: 0, limit: 50, offset: 0 });
  };
  const { res, body } = await invoke("GET", "/api/admin/users?search=Ragh%27Kor&status=suspended&limit=50&offset=0", { cookie: authCookies, csrf });
  assert.equal(res.statusCode, 200);
  assert.equal(body.data.total, 0);
  assert.match(calls[1], /admin\/users\?search=Ragh%27Kor&status=suspended&limit=50&offset=0$/);
});

test("refresh endpoint rotates tokens server-side and never returns them to JavaScript", async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const value = String(url);
    calls.push(value);
    if (value.endsWith("/api/v1/auth/refresh")) {
      return upstream(200, { access_token: "rotated-access", refresh_token: "rotated-refresh", user: admin }, [
        "access_token=rotated-access; Path=/; HttpOnly; Secure; SameSite=Lax",
        "refresh_token=rotated-refresh; Path=/; HttpOnly; Secure; SameSite=Lax",
      ]);
    }
    if (value.endsWith("/api/v1/auth/me")) return upstream(200, admin);
    throw new Error("unexpected upstream path");
  };

  const { res, body } = await invoke("POST", "/api/admin/refresh", { cookie: authCookies, csrf });
  assert.equal(res.statusCode, 200);
  assert.ok(calls.includes("https://aetherbase.test/api/v1/auth/refresh"));
  assert.ok(calls.includes("https://aetherbase.test/api/v1/auth/me"));
  assert.equal(JSON.stringify(body).includes("rotated-access"), false);
  assert.equal(JSON.stringify(body).includes("rotated-refresh"), false);
});

test("expired refresh sessions are rejected and both browser auth cookies are cleared", async () => {
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/api/v1/auth/me")) return upstream(401, { detail: "expired" });
    if (String(url).endsWith("/api/v1/auth/refresh")) return upstream(401, { detail: "revoked" });
    throw new Error("unexpected upstream path");
  };
  const { res, body } = await invoke("POST", "/api/admin/refresh", { cookie: authCookies, csrf });
  assert.equal(res.statusCode, 401);
  assert.equal(body.error.code, "unauthorized");
  assert.ok(res.cookies().some((cookie) => cookie.startsWith("access_token=;")));
  assert.ok(res.cookies().some((cookie) => cookie.startsWith("refresh_token=;")));
});

test("read-only session checks do not rotate or clear a still-refreshable session", async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return upstream(401, { detail: "access token expired" });
  };
  const { res, body } = await invoke("GET", "/api/admin/session", { cookie: authCookies, csrf });
  assert.equal(res.statusCode, 200);
  assert.equal(body.data.authenticated, false);
  assert.equal(body.data.reason, "session_expired");
  assert.equal(calls.length, 1);
  assert.equal(calls.some((url) => url.endsWith("/auth/refresh")), false);
  assert.equal(res.cookies().some((cookie) => cookie.startsWith("access_token=;")), false);
});

test("POST moderation requires same-origin and a matching CSRF token", async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error("must not call upstream"); };
  const { res, body } = await invoke("POST", "/api/admin/users/123e4567-e89b-42d3-a456-426614174000/ban", {
    body: { reason: "security" }, cookie: authCookies, csrf: "b".repeat(48), origin: "https://attacker.test",
  });
  assert.equal(res.statusCode, 403);
  assert.equal(body.error.code, "csrf_failed");
  assert.equal(called, false);
});

test("POST moderation rejects a mismatched double-submit CSRF token", async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error("must not call upstream"); };
  const { res, body } = await invoke("POST", "/api/admin/users/123e4567-e89b-42d3-a456-426614174000/ban", {
    body: { reason: "security" }, cookie: authCookies, csrf: "b".repeat(48), csrfCookie: "a".repeat(48),
  });
  assert.equal(res.statusCode, 403);
  assert.equal(body.error.code, "csrf_failed");
  assert.equal(called, false);
});

test("backend failures are sanitized before reaching the browser", async () => {
  globalThis.fetch = async () => { throw new Error("private host and stack trace"); };
  const { res, body } = await invoke("GET", "/api/admin/users", { cookie: authCookies, csrf });
  assert.equal(res.statusCode, 503);
  assert.match(body.error.message, /temporarily unavailable/i);
  assert.equal(JSON.stringify(body).includes("private host"), false);
  assert.equal(JSON.stringify(body).includes("stack trace"), false);
});

test("remote Aetherbase credentials are never sent over plain HTTP", async () => {
  const previous = process.env.AETHERBASE_API_URL;
  process.env.AETHERBASE_API_URL = "http://aetherbase.example.test";
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error("must not send credentials"); };
  try {
    const { res, body } = await invoke("GET", "/api/admin/users", { cookie: authCookies, csrf });
    assert.equal(res.statusCode, 503);
    assert.equal(body.error.code, "not_configured");
    assert.equal(called, false);
  } finally {
    process.env.AETHERBASE_API_URL = previous;
  }
});

test("suspend sends the exact reason and timezone-aware expiry contract", async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const value = String(url);
    calls.push({ url: value, init });
    if (value.endsWith("/api/v1/auth/me")) return upstream(200, admin);
    return upstream(200, { id: "123e4567-e89b-42d3-a456-426614174000", moderation_status: "suspended" });
  };
  const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { res } = await invoke("POST", "/api/admin/users/123e4567-e89b-42d3-a456-426614174000/suspend", {
    body: { reason: "security", suspended_until: expiry }, cookie: authCookies, csrf,
  });
  assert.equal(res.statusCode, 200);
  const action = calls[1];
  assert.match(action.url, /admin\/users\/123e4567-e89b-42d3-a456-426614174000\/suspend$/);
  assert.deepEqual(JSON.parse(action.init.body), { reason: "security", suspended_until: new Date(expiry).toISOString() });
});

test("ban, reinstate, and revoke-session actions forward only supported reason fields", async (t) => {
  for (const [action, reason] of [["ban", "abuse"], ["reinstate", "other"], ["revoke-sessions", "spam"]]) {
    await t.test(action, async () => {
      const calls = [];
      globalThis.fetch = async (url, init) => {
        const value = String(url);
        calls.push({ url: value, init });
        if (value.endsWith("/api/v1/auth/me")) return upstream(200, admin);
        return upstream(200, { status: "ok" });
      };
      const { res } = await invoke("POST", `/api/admin/users/${admin.id}/${action}`, {
        body: { reason, role: "administrator", is_admin: true }, cookie: authCookies, csrf,
      });
      assert.equal(res.statusCode, 200);
      assert.match(calls[1].url, new RegExp(`/admin/users/${admin.id}/${action}$`));
      assert.deepEqual(JSON.parse(calls[1].init.body), { reason });
    });
  }
});

test("backend last-administrator conflicts return a safe useful error", async () => {
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/api/v1/auth/me")) return upstream(200, admin);
    return upstream(409, { error: { message: "The last active administrator cannot be deactivated" } });
  };
  const { res, body } = await invoke("POST", "/api/admin/users/123e4567-e89b-42d3-a456-426614174000/ban", {
    body: { reason: "security" }, cookie: authCookies, csrf,
  });
  assert.equal(res.statusCode, 409);
  assert.match(body.error.message, /last active administrator/i);
  assert.equal(JSON.stringify(body).includes("database"), false);
});

test("audit events are fetched from the existing audit endpoint", async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).endsWith("/api/v1/auth/me")) return upstream(200, admin);
    return upstream(200, { events: [{ id: "evt-1", action: "ban", reason_code: "spam", outcome: "applied" }], total: 1, limit: 100, offset: 0 });
  };
  const { res, body } = await invoke("GET", "/api/admin/audit?target_user_id=123e4567-e89b-42d3-a456-426614174000&limit=100", { cookie: authCookies, csrf });
  assert.equal(res.statusCode, 200);
  assert.equal(body.data.events[0].action, "ban");
  assert.match(calls[1], /admin\/audit\?target_user_id=123e4567-e89b-42d3-a456-426614174000&limit=100&offset=0$/);
});

test("responsive player table has compact-card breakpoints and reduced-motion support", async () => {
  const css = await readFile(new URL("../src/components/admin/PlayersConsole.css", import.meta.url), "utf8");
  const component = await readFile(new URL("../src/components/admin/PlayersConsole.tsx", import.meta.url), "utf8");
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /data-label/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(component, /event\.action/);
  assert.match(component, /event\.reason_code/);
  assert.match(component, /No moderation events recorded/);
});
