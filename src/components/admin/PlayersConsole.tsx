import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "../../assets/lcars.css";
import {
  AdminApiError,
  type AdminAuditEvent,
  type AdminPlayer,
  type AdminSession,
  type ModerationReason,
  type PlayerStatus,
  getAdminSession,
  getPlayerAudit,
  listPlayers,
  moderatePlayer,
  notifyAdminSessionChanged,
  signInToAetherbase,
  signOutOfAetherbase,
} from "../../utils/adminApi";
import "./PlayersConsole.css";

const PAGE_SIZE = 50;
const REASONS: { value: ModerationReason; label: string }[] = [
  { value: "abuse", label: "Abuse" },
  { value: "harassment", label: "Harassment" },
  { value: "security", label: "Security" },
  { value: "spam", label: "Spam" },
  { value: "terms_violation", label: "Terms violation" },
  { value: "other", label: "Other" },
];

type Action = "suspend" | "ban" | "reinstate" | "revoke-sessions";

function localDateTimeAfterOneDay() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function localDateTimeNow() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function actionLabel(action: Action) {
  return {
    suspend: "Suspend player",
    ban: "Ban player",
    reinstate: "Reinstate player",
    "revoke-sessions": "Revoke all sessions",
  }[action];
}

function displayDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export default function PlayersConsole() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PlayerStatus | "">("");
  const [offset, setOffset] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<{ player: AdminPlayer; action: Action } | null>(null);
  const [reason, setReason] = useState<ModerationReason>("security");
  const [suspendedUntil, setSuspendedUntil] = useState(localDateTimeAfterOneDay);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [auditPlayer, setAuditPlayer] = useState<AdminPlayer | null>(null);
  const [auditEvents, setAuditEvents] = useState<AdminAuditEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");

  useEffect(() => {
    let mounted = true;
    getAdminSession()
      .then((data) => {
        if (mounted) setSession(data);
      })
      .catch((error: unknown) => {
        if (mounted) setSessionError(error instanceof Error ? error.message : "Could not check administrator access.");
      })
      .finally(() => {
        if (mounted) setSessionLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const loadPlayers = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const result = await listPlayers({ search, status, offset });
      setPlayers(result.users);
      setTotal(result.total);
    } catch (error) {
      const apiError = error instanceof AdminApiError ? error : null;
      setListError(apiError?.message || "Could not load players.");
      if (apiError?.status === 401) {
        setSessionError("Your Aetherbase administrator session expired. Sign in again.");
        setSession({ authenticated: false, csrf_token: session?.csrf_token || "" });
        notifyAdminSessionChanged();
      }
    } finally {
      setListLoading(false);
    }
  }, [offset, search, session?.csrf_token, status]);

  useEffect(() => {
    if (!session?.authenticated) return;
    const timer = window.setTimeout(() => { void loadPlayers(); }, search ? 220 : 0);
    return () => window.clearTimeout(timer);
  }, [loadPlayers, search, session?.authenticated]);

  useEffect(() => {
    if (!pending && !auditPlayer) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || actionLoading) return;
      setPending(null);
      setAuditPlayer(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [actionLoading, auditPlayer, pending]);

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);
  const hasPrevious = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  const beginAction = (player: AdminPlayer, action: Action) => {
    setPending({ player, action });
    setReason("security");
    setSuspendedUntil(localDateTimeAfterOneDay());
    setActionError("");
    setListError("");
    setNotice("");
  };

  const confirmAction = async () => {
    if (!pending) return;
    setActionLoading(true);
    setActionError("");
    setNotice("");
    try {
      const expiry = pending.action === "suspend"
        ? new Date(suspendedUntil).toISOString()
        : undefined;
      await moderatePlayer(pending.player.id, pending.action, reason, expiry);
      const label = actionLabel(pending.action);
      setNotice(`${label} confirmed for ${pending.player.email}.`);
      setPending(null);
      await loadPlayers();
    } catch (error) {
      const apiError = error instanceof AdminApiError ? error : null;
      if (apiError?.status === 401) {
        setSessionError("Your Aetherbase administrator session expired. Sign in again.");
        setSession({ authenticated: false, csrf_token: session?.csrf_token || "" });
        notifyAdminSessionChanged();
      } else {
        setActionError(apiError?.message || "The moderation request failed. No success was recorded.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const openAudit = async (player: AdminPlayer) => {
    setAuditPlayer(player);
    setAuditEvents([]);
    setAuditError("");
    setAuditLoading(true);
    try {
      const result = await getPlayerAudit(player.id);
      setAuditEvents(result.events);
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : "Could not load audit history.");
    } finally {
      setAuditLoading(false);
    }
  };

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    setSigningIn(true);
    setSessionError("");
    try {
      const next = await signInToAetherbase(email, password);
      setPassword("");
      setSession(next);
      notifyAdminSessionChanged();
      if (next.authenticated) setOffset(0);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Aetherbase sign-in failed.");
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setListError("");
    try {
      await signOutOfAetherbase();
    } catch {
      // The proxy clears the local cookies even if the upstream logout is unavailable.
    }
    setSession({ authenticated: false, csrf_token: session?.csrf_token || "" });
    setPlayers([]);
    setTotal(0);
    notifyAdminSessionChanged();
  };

  const isBlocked = session?.reason === "not_admin";
  const accountLabel = useMemo(() => session?.user?.display_name || session?.user?.email || "Aetherbase administrator", [session?.user]);

  if (sessionLoading) {
    return <main className="players-page"><div className="players-loading" role="status">Verifying administrator session…</div></main>;
  }

  if (sessionError && !session) {
    return (
      <main className="players-page">
        <section className="players-auth-card" role="alert">
          <p className="players-kicker">INSTALLATION ADMINISTRATION</p>
          <h1>Players Console unavailable</h1>
          <p>{sessionError}</p>
          <button className="players-button" onClick={() => window.location.reload()}>Retry</button>
        </section>
      </main>
    );
  }

  if (isBlocked) {
    return (
      <main className="players-page">
        <section className="players-auth-card" role="alert">
          <p className="players-kicker">ACCESS DENIED</p>
          <h1>Administrator access required</h1>
          <p>This Aetherbase account is a player account. Player data and characters remain unchanged.</p>
          <button className="players-button players-button-secondary" onClick={() => void handleSignOut()}>Sign out</button>
        </section>
      </main>
    );
  }

  if (!session?.authenticated) {
    return (
      <main className="players-page">
        <section className="players-auth-card">
          <p className="players-kicker">INSTALLATION ADMINISTRATION</p>
          <h1>Players Console</h1>
          <p>Sign in with this installation’s Aetherbase administrator account. This session uses HttpOnly cookies.</p>
          {sessionError && <p className="players-alert players-alert-error" role="alert">{sessionError}</p>}
          <form className="players-login-form" onSubmit={handleSignIn}>
            <label>Email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <button className="players-button" type="submit" disabled={signingIn}>
              {signingIn ? "Authenticating…" : "Authenticate administrator"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="players-page">
      <header className="players-header">
        <div className="players-header-cap" />
        <div className="players-header-main">
          <div>
            <p className="players-kicker">INSTALLATION ADMINISTRATION</p>
            <h1>Players Console</h1>
          </div>
          <div className="players-header-user">
            <span>{accountLabel}</span>
            <button className="players-button players-button-secondary" onClick={() => void handleSignOut()}>End admin session</button>
          </div>
        </div>
        <div className="players-header-tail" />
      </header>

      <section className="players-panel" aria-labelledby="players-heading">
        <div className="players-panel-heading">
          <div>
            <p className="players-kicker">ACCOUNT DIRECTORY</p>
            <h2 id="players-heading">Player accounts</h2>
          </div>
          <span className="players-count">{total} accounts</span>
        </div>

        <div className="players-filters">
          <label className="players-search">Search players
            <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setOffset(0); }} placeholder="Email or display name" />
          </label>
          <label>Status
            <select value={status} onChange={(event) => { setStatus(event.target.value as PlayerStatus | ""); setOffset(0); }}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
          </label>
        </div>

        {notice && <p className="players-alert players-alert-success" role="status">{notice}</p>}
        {listError && <p className="players-alert players-alert-error" role="alert">{listError}</p>}

        <div className="players-table-wrap" aria-busy={listLoading}>
          <table className="players-table" aria-labelledby="players-heading">
            <thead>
              <tr><th scope="col">Player</th><th scope="col">Registered</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Actions</th></tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id}>
                  <td data-label="Player"><strong>{player.display_name}</strong><span className="players-email">{player.email}</span></td>
                  <td data-label="Registered">{displayDate(player.created_at)}</td>
                  <td data-label="Role"><span className={player.is_admin ? "players-role players-role-admin" : "players-role"}>{player.is_admin ? "Administrator" : "Player"}</span></td>
                  <td data-label="Status"><span className={`players-status players-status-${player.moderation_status}`}>{player.moderation_status}</span></td>
                  <td data-label="Actions">
                    <div className="players-row-actions">
                      {player.moderation_status === "active" ? <>
                        <button onClick={() => beginAction(player, "suspend")}>Suspend</button>
                        <button className="players-danger" onClick={() => beginAction(player, "ban")}>Ban</button>
                      </> : <button onClick={() => beginAction(player, "reinstate")}>Reinstate</button>}
                      <button onClick={() => beginAction(player, "revoke-sessions")}>Revoke sessions</button>
                      <button onClick={() => void openAudit(player)}>Audit</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!listLoading && players.length === 0 && <tr><td className="players-empty" colSpan={5}>No players match these filters.</td></tr>}
              {listLoading && <tr><td className="players-empty" colSpan={5}>Scanning directory…</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="players-pagination">
          <span>{pageStart}–{pageEnd} of {total}</span>
          <div>
            <button className="players-button players-button-secondary" disabled={!hasPrevious || listLoading} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</button>
            <button className="players-button players-button-secondary" disabled={!hasNext || listLoading} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</button>
          </div>
        </div>
      </section>

      {pending && (
        <div className="players-modal-backdrop" role="presentation">
          <section className="players-modal" role="dialog" aria-modal="true" aria-labelledby="players-modal-title">
            <p className="players-kicker">CONFIRM MODERATION</p>
            <h2 id="players-modal-title">{actionLabel(pending.action)}</h2>
            <p>{pending.action === "revoke-sessions"
              ? `All active sessions for ${pending.player.email} will be revoked.`
              : `${actionLabel(pending.action)} for ${pending.player.email}?`}</p>
            {actionError && <p className="players-alert players-alert-error" role="alert">{actionError}</p>}
            <label>Reason
              <select value={reason} onChange={(event) => setReason(event.target.value as ModerationReason)}>
                {REASONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
              </select>
            </label>
            {pending.action === "suspend" && <label>Suspension expires
              <input type="datetime-local" min={localDateTimeNow()} value={suspendedUntil} onChange={(event) => setSuspendedUntil(event.target.value)} required />
            </label>}
            <div className="players-modal-actions">
              <button className="players-button players-button-secondary" disabled={actionLoading} onClick={() => setPending(null)}>Cancel</button>
              <button className={`players-button ${pending.action === "ban" ? "players-button-danger" : ""}`} disabled={actionLoading || (pending.action === "suspend" && !suspendedUntil)} onClick={() => void confirmAction()}>
                {actionLoading ? "Submitting…" : "Confirm action"}
              </button>
            </div>
          </section>
        </div>
      )}

      {auditPlayer && (
        <div className="players-modal-backdrop" role="presentation">
          <section className="players-modal players-audit-modal" role="dialog" aria-modal="true" aria-labelledby="audit-title">
            <div className="players-panel-heading">
              <div><p className="players-kicker">DURABLE MODERATION RECORD</p><h2 id="audit-title">Audit history</h2></div>
              <button className="players-close" aria-label="Close audit history" onClick={() => setAuditPlayer(null)}>×</button>
            </div>
            <p className="players-email">{auditPlayer.email}</p>
            {auditError && <p className="players-alert players-alert-error" role="alert">{auditError}</p>}
            {auditLoading ? <p role="status">Loading audit events…</p> : auditEvents.length === 0 ? <p>No moderation events recorded.</p> : (
              <ol className="players-audit-list">
                {auditEvents.map((event) => <li key={event.id}>
                  <div><strong>{event.action.replaceAll("_", " ")}</strong><span>{displayDate(event.created_at)}</span></div>
                  <p>{event.reason_code.replaceAll("_", " ")} · {event.outcome.replaceAll("_", " ")}</p>
                  <small>Administrator {event.actor_user_id || "system"}</small>
                </li>)}
              </ol>
            )}
            <div className="players-modal-actions"><button className="players-button players-button-secondary" onClick={() => setAuditPlayer(null)}>Close</button></div>
          </section>
        </div>
      )}
    </main>
  );
}
