# Player administration

The Players Console is available at `/admin/players`. It uses a separate Aetherbase administrator session; the site's existing Firebase session remains unchanged. Configure the server-side `AETHERBASE_API_URL` environment variable with the Aetherbase origin for this installation. Configure server-side `ASTRYX_PLATFORM_ADMIN_USER_ID` with the UUID of the one owner-authorized Astryx platform administrator; the proxy denies platform moderation when it is unset or the authenticated Aetherbase user ID differs.

The browser calls only same-origin `/api/admin/*` functions. Those functions use the existing Aetherbase login, refresh, logout, `/auth/me`, and moderation endpoints. They forward the Aetherbase access and refresh cookies as `HttpOnly` cookies and remove token fields from login and refresh responses before returning data to React. Expired sessions are refreshed through a CSRF-protected POST; failed refreshes clear both auth cookies. Admin roles are checked from Aetherbase `/auth/me` and enforced again by each Aetherbase moderation endpoint. No Firebase UID list grants access to this dashboard.

State-changing same-origin requests require a matching `astryx_admin_csrf` cookie and `X-Astryx-CSRF` header, plus an Origin check. Proxy responses use `Cache-Control: no-store`. A `401` clears the Aetherbase session cookies and returns the user to the Aetherbase sign-in form.

The player list, action payloads, status values, and reason codes match Aetherbase's `/api/v1/admin/*` contract. Suspensions require a future timezone-aware expiry. Every action is confirmed in the UI; the API remains authoritative for last-active-administrator protection. There is no delete action. Moderation changes Aetherbase account state and leaves RPG data and identity mappings intact.

This repository currently authenticates the main site with Firebase. Its existing Firebase identities are not automatically Aetherbase sessions or admin records. Administrators must have an Aetherbase account with administrator privileges. Account import/linking is handled separately from this dashboard.
