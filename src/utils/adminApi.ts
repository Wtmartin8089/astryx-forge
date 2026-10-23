export type AdminSessionUser = {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  is_active: boolean;
  must_change_password: boolean;
};

export type AdminSession = {
  authenticated: boolean;
  user?: AdminSessionUser;
  reason?: "not_admin" | "session_expired";
  csrf_token: string;
};

export type PlayerStatus = "active" | "suspended" | "banned";
export type ModerationReason =
  | "abuse"
  | "harassment"
  | "security"
  | "spam"
  | "terms_violation"
  | "other";

export type AdminPlayer = {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  is_active: boolean;
  moderation_status: PlayerStatus;
  suspended_until: string | null;
  email_verified: boolean;
  created_at: string;
};

export type AdminAuditEvent = {
  id: string;
  actor_user_id: string | null;
  target_user_id: string;
  action: string;
  reason_code: string;
  outcome: string;
  created_at: string;
};

export class AdminApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "request_failed") {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
  }
}

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string };
};

let csrfToken = "";

export function notifyAdminSessionChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("astryx-admin-session-changed"));
  }
}

async function request<T>(path: string, init: RequestInit = {}, allowRefreshRetry = true): Promise<T> {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  if (method !== "GET" && csrfToken) headers.set("X-Astryx-CSRF", csrfToken);

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      method,
      headers,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new AdminApiError(503, "Could not reach the administration service.", "network_error");
  }

  let envelope: ApiEnvelope<T>;
  try {
    envelope = await response.json() as ApiEnvelope<T>;
  } catch {
    throw new AdminApiError(502, "The administration service returned an invalid response.", "invalid_response");
  }
  if (!response.ok || envelope?.success === false) {
    const error = new AdminApiError(
      response.status,
      envelope?.error?.message || "The request could not be completed.",
      envelope?.error?.code,
    );
    if (
      response.status === 401 &&
      allowRefreshRetry &&
      csrfToken &&
      !["/api/admin/login", "/api/admin/logout", "/api/admin/refresh", "/api/admin/session"].includes(path.split("?")[0])
    ) {
      await request<{ authenticated: boolean }>("/api/admin/refresh", { method: "POST" }, false);
      return request<T>(path, init, false);
    }
    throw error;
  }
  return (envelope?.data ?? envelope) as T;
}

export async function getAdminSession(): Promise<AdminSession> {
  let session = await request<AdminSession>("/api/admin/session");
  if (session.reason === "session_expired" && csrfToken) {
    try {
      await request<{ authenticated: boolean }>("/api/admin/refresh", { method: "POST" }, false);
      session = await request<AdminSession>("/api/admin/session");
    } catch {
      // A rejected refresh clears both auth cookies in the same-origin proxy.
    }
  }
  csrfToken = session.csrf_token;
  return session;
}

export async function signInToAetherbase(email: string, password: string) {
  const session = await request<AdminSession>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  csrfToken = session.csrf_token;
  return session;
}

export async function signOutOfAetherbase(): Promise<void> {
  if (!csrfToken) {
    await getAdminSession();
  }
  await request<{ status: string }>("/api/admin/logout", { method: "POST" });
  csrfToken = "";
  notifyAdminSessionChanged();
}

export async function listPlayers(options: {
  search?: string;
  status?: PlayerStatus | "";
  offset?: number;
} = {}) {
  const params = new URLSearchParams({ limit: "50", offset: String(options.offset || 0) });
  if (options.search?.trim()) params.set("search", options.search.trim());
  if (options.status) params.set("status", options.status);
  return request<{ users: AdminPlayer[]; total: number; limit: number; offset: number }>(
    `/api/admin/users?${params.toString()}`,
  );
}

export async function moderatePlayer(
  playerId: string,
  action: "suspend" | "ban" | "reinstate" | "revoke-sessions",
  reason: ModerationReason,
  suspendedUntil?: string,
) {
  const body = action === "suspend"
    ? { reason, suspended_until: suspendedUntil }
    : { reason };
  return request<AdminPlayer | { status: string; revoked_refresh_tokens: number }>(
    `/api/admin/users/${encodeURIComponent(playerId)}/${action}`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function getPlayerAudit(playerId: string) {
  const params = new URLSearchParams({ target_user_id: playerId, limit: "100" });
  return request<{ events: AdminAuditEvent[]; total: number; limit: number; offset: number }>(
    `/api/admin/audit?${params.toString()}`,
  );
}
