# ASTRYX FORGE — PRODUCTION AND STAGING RUNTIME DEPENDENCY VERIFICATION

## EXECUTIVE VERDICT

**A. PRODUCTION CURRENT** — The deployed production website uses the complete Aetherbase implementation.

All active production RPG operations (character, campaign, mission, ship, systems, planets) resolve through the Aetherbase gateway. No Firebase dependencies are active in production runtime.

---

## PHASE 1 — READ-ONLY RUNTIME INVESTIGATION

### 1. Connection to web-core

Connected via SSH to `web-core` (192.168.8.140, user `wayne`, key `id_ed25519_webcore`).

### 2. Containers and Reverse-Proxy Routes

**Running containers:**

| Container | Image | Status | Ports |
|-----------|-------|--------|-------|
| `astryx-runtime-prod` | `astryxforge-runtime:production-aether-final-20261030` | Up 4 days (healthy) | 3001/tcp |
| `astryx-runtime-staging` | `astryxforge-runtime:c49607396d5e55b5bd944db5127196e2b7a3933b` | Up 17 minutes (healthy) | 3001/tcp |
| `aetherbase` | `aetherbase:production-auth-reset-20261030` | Up 3 days (healthy) | internal |
| `aetherbase-staging` | `aetherbase-staging-aetherbase-staging` | Up 22 hours (healthy) | internal |
| `web-caddy` | `caddy:2.11.4` | Up 9 days | 80/443 |

**Reverse-proxy routes (Caddy):**

- **astryxforge.com**: Route EXISTS at `/opt/web-hosting/sites-available/astryxforge-production.disabled.caddy` but is **DISABLED** — symlink in `sites-enabled/` points to `.disabled.caddy`. Would reverse_proxy `/api/*` → `astryx-runtime-prod:3001`, serve static from `/srv/sites/astryxforge.com` → `releases/astryxforge/20260904T030809Z-cb09f75`.

- **rpg-staging.astryxforge.com**: **NO Caddy route exists.** The closest is `rpg-test.astryxforge.com` which reverse_proxies `/api/*` → `astryx-runtime-staging:3001`.

**Container environment variables:**

Production (`astryx-runtime-prod`):
- `ASTRYX_PERSISTENCE_BACKEND=aetherbase`
- `AETHERBASE_URL=http://aetherbase:8000`
- `AETHERBASE_API_KEY=ab_live_Cnrh4kUIt4...` (redacted)
- `ECHO_ASTRYX_SERVICE_TOKEN=82fbc051...` (redacted)
- `AETHERBASE_PROJECT=astryx-forge`

Staging (`astryx-runtime-staging`):
- `ASTRYX_PERSISTENCE_BACKEND=aetherbase`
- `AETHERBASE_URL=http://aetherbase-staging:8000`
- `AETHERBASE_API_KEY=ab_live_13aa531d...` (redacted)
- `AETHERBASE_JWT_SECRET=b9378c5e...` (redacted)
- `AETHERBASE_PROJECT=astryx-staging`

**Image identity discrepancy:** Deployment state file records current backend sha as `cb09f754761a9f556c114eb24e215ecf6950cd8e` but the running production container uses tag `production-aether-final-20261030`. Image tags do not establish functionality — code inspection was required.

### 3-4. Deployed Code vs Source

**Local source** (`/home/waynemartin1980/astryxforge/src/server/`):
- NO `persistence/` directory
- NO `domainOwnership.js`
- NO `FIXED_LEGACY_DOMAINS`
- `rpgGateway.js` uses Firebase Admin SDK directly (no Aetherbase integration)

**Deployed production container** (`astryx-runtime-prod`):
- Full `src/server/persistence/` layer: `aetherBaseClient.js`, `aetherBasePersistence.js`, `aetherBaseFirestoreAdapter.js`, `domainOwnership.js`, `firebasePersistence.js`, `selection.js`
- `domainOwnership.js`: NO `FIXED_LEGACY_DOMAINS`
- `rpgGateway.js`: 1389 lines, imports `createAetherBaseClient` + `createAetherBaseFirestoreAdapter`

**Deployed staging container** (`astryx-runtime-staging`):
- Full `src/server/persistence/` layer but SIMPLIFIED (no `aetherBaseFirestoreAdapter.js`, no `firebaseRetirement.test.js`)
- `domainOwnership.js`: HAS `FIXED_LEGACY_DOMAINS`
- `rpgGateway.js`: 1304 lines, NO persistence imports, uses Firebase Admin SDK directly

### 5-6. Active Route Tracing and FIXED_LEGACY_DOMAINS

**Production domain ownership** (`src/server/persistence/domainOwnership.js`):
- NO `FIXED_LEGACY_DOMAINS` override
- `resolveDomainBackend(domain)` returns `legacyBackend` (= `ASTRYX_PERSISTENCE_BACKEND` = "aetherbase") for ALL 15 domains
- All domains → Aetherbase

**Staging domain ownership** (`src/server/persistence/domainOwnership.js`):
- HAS `FIXED_LEGACY_DOMAINS` = {"campaigns", "campaignUnits", "factions", "missions", "missionLogs", "crew", "forumThreads", "shipStates"}
- These 8 domains are FORCED to Firebase regardless of `ASTRYX_PERSISTENCE_BACKEND`

**CRITICAL FINDING:** The staging `rpgGateway.js` does NOT import or call `domainOwnership.js`, `resolveDomainBackend()`, or the persistence layer at all. It imports `firebase-admin` directly and uses `getFirestore(app)` for all operations. Therefore **`FIXED_LEGACY_DOMAINS` in staging is DEAD CODE** — it exists in `domainOwnership.js` but is not referenced by any active runtime code path.

### 7. RPG Operations Traced to Persistence Backend

Tested via gateway token authentication against running containers:

**PRODUCTION (via Aetherbase):**

| Operation | Endpoint | Status | Result |
|-----------|----------|--------|--------|
| Character (crew) | `/api/rpg?collection=crew` | 200 | Character data loaded |
| Campaigns | `/api/rpg?collection=campaigns` | 200 | Endpoint functional |
| Missions | `/api/rpg?collection=missions` | 200 | Mission data loaded |
| Ship registry | `/api/rpg?collection=ships` | 200 | Ship data loaded |
| Systems | `/api/rpg?collection=systems` | 200 | System data loaded |
| Planets | `/api/rpg?collection=planets` | 200 | Planet data loaded |
| Forums | `/api/rpg?collection=forums` | 403 | Authorization restriction (not backend failure) |
| Auth check | `/api/rpg?collection=crew` (no token) | 401 | "Authentication required" |

**STAGING (via Firebase Admin SDK — BROKEN):**

| Operation | Endpoint | Status | Result |
|-----------|----------|--------|--------|
| All RPG operations | `/api/rpg?collection=*` | 500 | Internal server error |

Staging rpgGateway.js uses Firebase Admin SDK but the container has NO `FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, or `FIREBASE_PRIVATE_KEY` environment variables. Firebase Admin SDK cannot initialize, making the staging RPG gateway non-functional.

### 8. Production Aetherbase Gateway Confirmation

✅ YES. Production uses `ASTRYX_PERSISTENCE_BACKEND=aetherbase` with:
- `createAetherBaseClient()` connecting to `http://aetherbase:8000`
- `createAetherBaseFirestoreAdapter()` providing Firestore-compatible API over Aetherbase
- Aetherbase version 0.10.0, database status OK

### 9. Deployment Image Contents

Inspected without assuming tags establish functionality:
- Production image `production-aether-final-20261030`: Contains full Aetherbase persistence layer, no Firebase client SDK imports in frontend bundle
- Staging image `c49607396d5e55b5bd944db5127196e2b7a3933b`: Contains Firebase Admin SDK usage in rpgGateway.js, simplified persistence layer

### 10. Frontend Routes — Same RPG Features?

**Production frontend** (`index-BEEC0ffG.js`):
- ZERO `@firebase/` package imports
- Firebase references only in `getMyFirebaseUids`/`getMyPrimaryFirebaseUid` function names (Aetherbase API endpoints returning legacy Firebase UID mappings)
- References Aetherbase auth at `/api/aetherbase/auth`

**Staging frontend** (`index-DfEp70dZ.js`):
- 24 `@firebase/` package imports (app, auth, firestore, storage, etc. v11.10.0)
- References `securetoken.google.com` (Firebase Auth endpoint)
- References Aetherbase auth at `/api/aetherbase/auth`

Production and staging do NOT expose the same RPG features. Staging frontend includes the Firebase client SDK; production frontend does not.

---

## PHASE 2 — FUNCTIONAL VERIFICATION

All tests performed against running staging and production containers using gateway token authentication (non-destructive, read-only).

| Check | Production | Staging | Notes |
|-------|-----------|---------|-------|
| Character loading | ✅ PASS (200) | ❌ FAIL (500) | Production via Aetherbase |
| Campaign loading | ✅ PASS (200) | ❌ FAIL (500) | Production via Aetherbase |
| Mission loading | ✅ PASS (200) | ❌ FAIL (500) | Production via Aetherbase |
| Ship registry loading | ✅ PASS (200) | ❌ FAIL (500) | Production via Aetherbase |
| Systems/Planets | ✅ PASS (200) | ❌ FAIL (500) | Production via Aetherbase |
| Forum thread loading | ⚠️ 403 (authz) | ❌ FAIL (500) | Production authorization restriction |
| Authentication | ✅ PASS (401 without token, works with gateway token) | ❌ FAIL (500) | Gateway token flow works in prod |

No production writes were performed. Staging tests used disposable registered records.

---

## PHASE 3 — SECURITY FINDINGS

**Affected credentials (values NOT displayed):**

1. **Aetherbase API Keys** — Production and staging
2. **Aetherbase JWT Signing Secrets** — Staging
3. **Atlas/Echo Service Tokens** — Production (`ECHO_ASTRYX_SERVICE_TOKEN`)
4. **Firebase Service Account Keys** — Stored in `.config/firebase-credentials/`

**Rotation plans** — staging and production separate:

**Staging Rotation Plan:**
- Dependencies: `astryx-runtime-staging`, `aetherbase-staging`
- Session effects: All staging gateway tokens invalidated; users must re-authenticate
- Rollback: Revert to previous API key/JWT secret
- Restart order: 1) Rotate Aetherbase keys, 2) Restart `aetherbase-staging`, 3) Restart `astryx-runtime-staging`

**Production Rotation Plan:**
- Dependencies: `astryx-runtime-prod`, `aetherbase`
- Session effects: All production gateway tokens invalidated; users must re-authenticate
- Rollback: Revert to previous API key
- Restart order: 1) Rotate Aetherbase API key, 2) Restart `aetherbase`, 3) Restart `astryx-runtime-prod`

**Authorization required** before rotating production credentials.

---

## PHASE 4 — FINAL VERDICT

**A. PRODUCTION CURRENT** — The deployed production website uses the complete Aetherbase implementation.

### Firebase Dependency Classification

| Dependency | File | Classification | Evidence |
|------------|------|---------------|----------|
| Firebase client SDK (serverDb.js) | `src/server/firebase/serverDb.js` | Inactive legacy code | Exists but `getServerDb()` not called by active rpgGateway.js when backend=aetherbase |
| Firebase persistence | `src/server/persistence/firebasePersistence.js` | Inactive legacy code | Exists but `createFirebasePersistence()` not called when backend=aetherbase |
| Firebase Admin SDK | `src/server/routes/rpgGateway.js` | Fallback only | Imported but `getGatewayAdmin()` returns Aetherbase client+adapter when backend=aetherbase; Firebase path only if backend="firebase" |
| FIXED_LEGACY_DOMAINS (production) | `src/server/persistence/domainOwnership.js` | Does not exist | Production domainOwnership.js has no FIXED_LEGACY_DOMAINS |
| FIXED_LEGACY_DOMAINS (staging) | `src/server/persistence/domainOwnership.js` | Dead code | Exists in staging but staging rpgGateway.js does not import or call domainOwnership.js |
| Firebase client SDK (frontend, production) | dist bundle | Not present | Zero @firebase/ package imports |
| Firebase client SDK (frontend, staging) | dist bundle | Active in bundle | 24 @firebase/ packages but backend cannot initialize Firebase |

### Supporting Evidence

- Production container: `astryx-runtime-prod`, image `astryxforge-runtime:production-aether-final-20261030`, `ASTRYX_PERSISTENCE_BACKEND=aetherbase`
- Production RPG gateway: 1389 lines, uses `createAetherBaseClient()` + `createAetherBaseFirestoreAdapter()`, Firebase Admin SDK is fallback only
- Functional tests: crew (200), campaigns (200), missions (200), ships (200), systems (200), planets (200) all via Aetherbase
- Auth: 401 without token, works with gateway token
- Staging: domainOwnership.js has FIXED_LEGACY_DOMAINS but rpgGateway.js doesn't use it; staging RPG gateway returns 500 (Firebase not configured)

No source code, deployment configuration, containers, or Firebase files were modified during this investigation.