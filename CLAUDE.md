# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server (HMR)
npm run build      # Type-check with tsc then build to dist/
npm run lint       # Run ESLint
npm run preview    # Preview the production build
npm run seed       # Seed planets collection to Firestore (run once)
```

No test suite is configured.

## Architecture

This is a React 19 + TypeScript + Vite SPA for a Star Trek tabletop RPG campaign. It uses Firebase (Auth, Firestore, Storage) as the backend and Tailwind CSS + custom LCARS CSS for styling.

### Routing (`src/App.tsx`)
All routes are defined here. Authentication is enforced: unauthenticated users are redirected to `/auth`; authenticated users at `/auth` are redirected to `/`. The `NavBar` and `ComputerCore` components are mounted only when a user is logged in.

### Route → Component map
| Path | Component |
|------|-----------|
| `/` | `StarMap` — interactive image map of planets |
| `/starbase` | `Starbase` |
| `/fleet` | `FleetRegistry` |
| `/ship/:shipSlug` | `ShipPage` |
| `/crew` | `CrewRoster` |
| `/crew/:crewSlug` | `CrewPage` |
| `/choose-character` | `ChooseCharacter` |
| `/planet/:planetName` | `PlanetPage` |
| `/forum` | `Forum` |
| `/stardate` | `StardateCalculator` |
| `/settings` | `AccountSettings` |
| `/auth` | `AuthPanel` |

### Data layer

**Firestore collections:**
- `crew` — crew member documents (slug as doc ID). Managed via `src/utils/crewFirestore.ts`.
- `forumThreads` — forum threads with subcollection `replies`. Managed via `src/utils/forumFirestore.ts`.
- `planets` — seeded via `npm run seed` from `src/data/planetsData.json`.

**Local storage fallback:**
Ships and crew data (`shipsData`, `crewData` keys) have JSON defaults in `src/data/` and are read/written via `src/utils/gameData.ts`. This is the legacy path; Firestore is authoritative for crew.

**Static seed data** lives in `src/data/` as JSON and TypeScript files:
- `crewData.json` / `shipsData.json` — default records (slug → object)
- `planetsData.json` — planet records for Firestore seeding
- `starshipClasses.ts` — canonical Federation ship classes
- `forumCategories.ts` — forum category IDs and labels (used as a discriminated union type)

### Types (`src/types/fleet.ts`)
`ShipData` and `CrewMember` are the core domain types. `CrewMember.status` is `"active" | "pending"` — new character submissions are pending until an admin approves them.

### Admin
`src/utils/adminAuth.ts` contains a hardcoded `ADMIN_UIDS` array. Add a Firebase Auth UID here to grant admin access. Admins can approve/reject pending characters and seed crew data from `AccountSettings`.

### Styling
- **LCARS aesthetic** — custom CSS in `src/assets/lcars.css` (global) and `styles/lcars.module.css` (CSS modules). The orange/gold navbar gradient and purple accents are intentional LCARS theming.
- **Tailwind** — configured via `tailwind.config.js` and `postcss.config.js`. Both Tailwind utility classes and the custom LCARS CSS are used throughout.
- **CSS Modules** — `styles/lcars.module.css` and `styles/starbase.module.css` are used by specific components.

### Pages directory (`pages/`)
Contains a legacy/unused Next.js-style API route (`pages/api/computer.js`) that wraps GPT-4o as a Starfleet computer voice. It is **not wired into the Vite app** and would require a separate serverless host (e.g., Vercel) to function.

### Firebase config
`src/firebase/firebaseConfig.ts` exports `app`, `db`, `storage`, and `auth`. The API key in this file is a public web API key (normal for Firebase browser clients).
