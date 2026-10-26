# AGENTS.md — badminton-tournament-maker-v2

Vite + React 18 + TS + Tailwind app with Cloudflare Pages Functions and Cloudflare D1 serverless SQLite database. Fully offline-first badminton doubles tournament manager with D1 cloud synchronization (zero Firebase).

## Commands

- `npm run dev` — local Vite dev server
- `npm run build` — `tsc && vite build` (typecheck is part of build)
- `npm test` — run Vitest test suite (`src/utils/engine.test.ts`)
- `npm run pages:dev` — run Cloudflare Pages local development with D1 proxy
- `npm run d1:init:local` — initialize local D1 SQLite schema
- `npm run d1:init:remote` — execute schema migration on remote Cloudflare D1
- `npm run pages:deploy` — build and deploy to Cloudflare Pages

## Architecture

- Entry: `index.html` → `src/main.tsx` → `src/App.tsx` (`TournamentApp`, wrapped in `ErrorBoundary`).
- Cloudflare D1 Database: `badminton-tournament-maker-v2-db` (`c0ae2fbe-be6a-4e32-8415-a88b93b81915`).
- Serverless API (`functions/api/`):
  - `functions/api/tournaments.ts`: REST endpoints for listing, fetching, syncing, deleting, and purging draft tournaments in D1.
  - `functions/api/roster.ts`: REST endpoints for predefined roster persistence in D1.
- Client Services:
  - `src/services/api.ts`: Interacts with Cloudflare D1 `/api/tournaments` and `/api/roster`. Includes polling for live match updates and automatic fallback to `localStorage`.
- Engine & Rules:
  - `src/utils/engine.ts`: Pairing (`pairPlayersIntoTeams`), bracket builder (`buildDynamicTournamentStructure`), court conflict detection (`getMatchCourtConflict`), scoring validation (`isValidScore`).
- Conflict Gate:
  - `src/components/ActiveConflictModal.tsx`: Prevents accidental concurrent active tournaments; prompts to close/archive or delete existing active tournaments before starting new ones.
