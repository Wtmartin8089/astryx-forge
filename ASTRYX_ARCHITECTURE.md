# Astryx Forge Architecture

## 1. Project Overview

Astryx Forge is a React + Firebase web platform for persistent sci-fi tabletop RPG campaigns.

It supports:
- authenticated player accounts
- player-created and claimable characters
- ship and crew management
- campaign creation and mission generation
- forum-style in-universe communication
- galaxy exploration with progressive reveal mechanics (sector entry, sensor sweep, system identification, system survey, anomaly investigation)
- archival discovery records and narrative systems

The project uses a hybrid architecture:
- frontend SPA (Vite + React)
- Firebase client SDK for direct real-time data access
- Vercel-style serverless API routes in `pages/api` for gameplay engines and AI-backed endpoints

## 2. Tech Stack

### Languages
- TypeScript (frontend)
- JavaScript (serverless/game engines)
- JSON (seed and static game data)

### Frontend
- React 19
- React Router 7
- Vite 7
- LCARS custom styling (`src/assets/lcars.css`, `styles/*.css`)
- Tailwind/PostCSS configured (limited direct usage)

### Backend / API Runtime
- Vercel-style serverless functions in `pages/api/*`
- Shared backend/domain logic in `src/server/*` (Express-compatible handler pattern)

### Data & Auth
- Firebase Auth (account/session)
- Cloud Firestore (primary database)
- Firebase Storage (attachments/comms uploads)

### AI Integrations
- Local Ollama service (`src/server/ai/ollamaService.js`) for campaign/mission/system generation
- Anthropic API in legacy route `pages/api/generateCampaign.js`
- OpenAI API in legacy route `pages/api/computer.js`

## 3. Project Directory Structure

```text
.
├── pages/
│   └── api/                          # Serverless API entrypoints
│       ├── ai/
│       ├── anomaly/
│       ├── archive/
│       ├── galaxy/
│       ├── navigation/
│       ├── scan/
│       ├── sector/
│       ├── survey/
│       ├── computer.js
│       ├── computerCommand.js
│       ├── exploreSystem.js
│       └── generateCampaign.js
├── src/
│   ├── App.tsx                       # Main app routes and auth gating
│   ├── components/                   # UI modules (maps, crew, ships, forum, AI tools)
│   ├── pages/
│   │   └── CreateCampaign.tsx
│   ├── firebase/
│   │   └── firebaseConfig.ts
│   ├── server/                       # Core backend domain engines and route handlers
│   │   ├── ai/
│   │   ├── anomalies/
│   │   ├── archive/
│   │   ├── computerCore/
│   │   ├── contact/
│   │   ├── firebase/
│   │   ├── fleet/
│   │   ├── galaxy/
│   │   ├── medals/
│   │   ├── navigation/
│   │   ├── routes/
│   │   ├── ships/
│   │   ├── systems/
│   │   └── time/
│   ├── utils/                        # Firestore helpers + local gameData adapter
│   ├── data/                         # Seed/default game data
│   └── types/
├── seedPlanets.js                    # Firestore seeding script
├── stardate-test/                    # Separate experimental Vite app
└── config/
    └── galaxySeed.js
```

## 4. Core Systems

### Player Accounts
- Firebase Auth-backed login/signup/reset in `AuthPanel.tsx`.
- Route protection is enforced in `App.tsx` via `onAuthStateChanged`.
- Admin control via static UID list in `src/utils/adminAuth.ts`.

### Character System
- Firestore `crew` collection is authoritative character storage.
- Real-time crew subscriptions via `subscribeToAllCrew` and `subscribeToShipCrew`.
- Claiming uses a Firestore transaction to prevent race conditions.
- Character lifecycle supports `pending` -> `active` moderation.

### Ship & Crew System
- Current UI ship registry is largely localStorage-backed (`gameData.ts`, `FleetRegistry`, `ShipPage`).
- Crew ownership/identity is Firestore-backed, but ship assignment is currently hybrid (Firestore `crew.shipId` plus local ship records).
- Additional server-side ship/fleet command engines exist under `src/server/ships/*` and `src/server/fleet/*` for deeper operational gameplay.

### Mission System
- AI mission generation endpoint: `/api/ai/generateMission`.
- Context builder reads campaign state and recent world data.
- Accepted missions are stored in Firestore `missions`.

### Exploration System
- Sector generation is deterministic from designation and persisted.
- Exploration progression model:
  - sector enter -> load/generate sector
  - scan sector -> systems level `0 -> 1` (unknown signals)
  - scan system -> `1 -> 2` (identified)
  - survey system -> `>=1 -> 3` (planet/anomaly visibility)
  - anomaly scan -> investigation levels `0 -> 4`
- Movement engine (`warpEngine`) updates traveling ships and runs sweeps per tick.

### Galaxy Database
- Core procedural + persisted entities: sectors, systems, planets, anomalies.
- Visibility/sanitization logic prevents leaking hidden data to clients.
- Campaign-scoped galaxy state is keyed by `campaignId` across collections.

## 5. Database Structure

Primary Firestore collections identified in code:

- `campaigns`: campaign metadata (GM, world type, visibility)
- `campaignUnits`: campaign primary units (ships/boards)
- `crew`: player characters and ownership
- `forumThreads` (+ subcollection `replies`): in-game forum/discussion
- `missions`: mission records (including AI-generated)
- `systems`: generated/discovered star systems
- `sectors`: sector metadata and charting progress
- `planets`: generated/seeded planets
- `anomalies`: anomaly records and investigation progression
- `ships`: server-side ship logistics/movement state
- `shipComms/{shipSlug}/messages`: ship communication threads
- `missionLogs`: mission log uploads
- `archiveEntries`: galactic archive canonical entries
- `archiveEdits`: immutable archive edit history
- `firstContactRecords`: first contact lifecycle state
- `fleetCommands`: top-level fleet organizations
- `taskForces`: fleet sub-groups
- `crewAssignments`: operational player-to-ship role assignments
- `playerRanks`: canonical player rank state
- `promotionRecords`: promotion audit trail
- `fleetOrders`: issued fleet orders
- `shipCommands`: captain command assignments
- `commandRequests`: command request workflow
- `shipStates`: per-ship operational subsystem state
- `universeTime` (singleton doc): canonical stardate
- `scheduledEvents`: future stardate-triggered events
- `players`: player progression/eligibility profile reads
- `factions`: optional narrative context for mission generation
- `medals`: medal catalog extension
- `playerMedals`: awarded medals/ribbons

## 6. API Endpoints

### Active serverless entrypoints (pages/api)

- `POST /api/ai/generateCampaign` -> AI campaign concept generation (Ollama)
- `POST /api/ai/generateMission` -> AI mission generation from campaign context
- `POST /api/anomaly/scan` -> advance anomaly investigation
- `POST /api/archive/create` -> create archive entry
- `POST /api/archive/edit` -> add archive edit/update
- `GET /api/archive/search` -> archive search/filter
- `GET /api/archive/:entryId` -> archive entry + edit history
- `POST /api/galaxy/enter-sector` -> load/generate sector + sanitize visible systems
- `POST /api/navigation/plot-course` -> set ship destination and warp
- `POST|GET /api/navigation/tick` -> movement tick processing for traveling ships
- `POST /api/scan/sector` -> sensor sweep (detect systems)
- `POST /api/scan/system` -> identify a detected system
- `GET /api/sector/:id` -> sector snapshot (visible systems/signals/anomalies/ships)
- `POST /api/survey/system` -> survey system and reveal deeper data
- `POST /api/computerCommand` -> command parsing + computer response routing
- `POST /api/exploreSystem` -> legacy exploration endpoint used by `CampaignMap`

### Legacy/alternative endpoints in repo
- `POST /api/computer` (OpenAI-based, separate path from `computerCommand`)
- `POST /api/generateCampaign` (Anthropic-based legacy generator)

## 7. Frontend Architecture

### App shell and routing
- `src/main.tsx` mounts React app in `BrowserRouter`.
- `src/App.tsx` defines route map and auth redirects.
- Authenticated users see shared `NavBar` and `ComputerCore` shell components.

### UI domains
- Campaign and exploration UI:
  - `CreateCampaign.tsx`
  - `CampaignMap.tsx` (legacy map model)
  - `SectorMap.tsx` (new sector polling model)
- Character and crew UI:
  - `ChooseCharacter`, `CrewRoster`, `CrewPage`, `Starbase`
- Ship UI:
  - `FleetRegistry`, `ShipPage`
- Narrative/social UI:
  - `Forum`, `MissionLogs`, `AIGenerateCampaign`, `AIGenerateMission`

### Frontend-backend interaction patterns
- Direct Firestore real-time reads/writes for many UI surfaces (crew/forum/missions/comms/campaigns).
- API route calls for simulation and AI operations (sector scan/survey/navigation/anomaly/mission generation).
- LocalStorage persistence still used for ship registry and some crew/ship linking metadata.

## 8. Gameplay Systems

- Character ownership and moderation:
  - players claim characters
  - admins approve/reject pending characters
- Crew/ship roleplay:
  - assign crew to ships
  - ship-specific communications boards
- Exploration loop:
  - enter sector
  - detect unknown signatures
  - identify and survey systems
  - investigate anomalies progressively
- Navigation loop:
  - plot course at warp factors
  - movement ticks with potential random events
  - passive discovery through sensor sweeps during travel
- Campaign narrative generation:
  - AI-generated campaign seeds and mission briefs
  - mission records stored as campaign artifacts
- Archive and first-contact systems:
  - structured discovery records and edit history
  - first-contact outcomes can auto-create species archive entries
- Time and progression systems:
  - global stardate singleton
  - scheduled event firing
  - medal/ribbon and fleet command progression engines

## 9. Data Flow

Typical flow patterns:

1. User authenticates in frontend (`Firebase Auth`).
2. Frontend reads/writes real-time data directly (`Firestore`/`Storage`) for CRUD-style features.
3. For simulation or AI actions, frontend calls `/api/*` serverless routes.
4. API routes execute domain logic in `src/server/*` and persist results to Firestore.
5. Updated Firestore state streams back to clients via `onSnapshot` or periodic polling.

Example exploration flow:

1. `SectorMap` polls `GET /api/sector/:id`.
2. User triggers scan/survey actions (or ship movement tick runs sensor sweep).
3. Route handlers update `systems`, `sectors`, `anomalies`, `ships`.
4. Next poll reflects new charting percent, revealed signals/systems/anomalies.

## 10. Suggested Improvements

1. Unify ship data source.
- Current architecture mixes localStorage ship models with Firestore/server-side ship engines.
- Migrate `FleetRegistry`/`ShipPage` to Firestore `ships` to remove split-brain state.

2. Consolidate exploration path.
- `CampaignMap` uses a legacy `systems` schema (`x`,`y`,`discovered`), while `SectorMap` uses newer sectorized schema (`xCoord`,`yCoord`,`explorationLevel`).
- Choose one canonical exploration model and deprecate the other.

3. Standardize API surface.
- There are overlapping legacy and current endpoints (`/api/generateCampaign` vs `/api/ai/generateCampaign`, `/api/computer` vs `/api/computerCommand`).
- Retire duplicates and document a single stable contract.

4. Centralize authz on backend routes.
- Most route handlers validate payloads but do not enforce authenticated identity/role server-side.
- Add token verification + campaign/ship permission checks per route.

5. Remove secrets/config from client code where possible.
- Firebase web config is expected to be public, but admin behavior should not rely on hardcoded UID lists in frontend code.
- Move admin role checks to secure backend/claims.

6. Add test coverage for core simulation engines.
- No automated test suite is configured.
- Prioritize deterministic tests for `generateSector`, `runSensorSweep`, `identifySystem`, `surveySystem`, and movement tick logic.

7. Add schema and index documentation.
- Several routes depend on composite indexes and implicit field contracts.
- Add Firestore index manifest and collection field definitions to reduce operational drift.

8. Introduce clear module boundaries.
- `src/server/*` includes production-ready systems and partially integrated systems.
- Tag modules as `active`, `experimental`, or `planned`, and prevent accidental coupling from UI to experimental engines.
