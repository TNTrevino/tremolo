# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Tremolo (tremolonotes.com) is a music-education practice app (competitor to musictheory.net) for 6th–12th grade students. It is three services in one repo:

- `frontend/` — React + TypeScript + Vite SPA (Tailwind, Zustand, TanStack Query, react-router). Renders MusicXML with OpenSheetMusicDisplay (OSMD).
- `backend/music/` — Python FastAPI "music generation" microservice (port 8000). Uses **music21** to generate exercises and returns MusicXML (plus answer metadata for games). Stateless, no auth.
- `backend/main/` — Go (Gin) "user tracking" microservice (port 5001). Auth (JWT + Google OAuth), users/teachers/friends, game settings, score entries, dashboard charts. Postgres via **sqlc** (queries in `database/queries/`, generated code in `database/generated/`, goose-style migrations in `database/migrations/`).

The frontend talks to both services directly (`VITE_BACKEND_MUSIC`, `VITE_BACKEND_MAIN`). The Go and Python services do not talk to each other.

Deep per-service docs (read before structural changes in a service): `frontend/ARCHITECTURE.md`, `backend/main/README.md`, `backend/music/README.md`. Each service also has its own `CLAUDE.md` with that service's invariants.

## Commands

A root `Makefile` wraps the commands below per service — prefer these over the raw commands (no `cd`/venv-activation needed): `make test|lint|format|check` (all services) or `make {test,lint,format,check}-{frontend,music,go}` (single service, e.g. `make test-music`). Run `make help` for the full list.

Frontend (`cd frontend`):
- `npm run dev` — Vite dev server (port 5173)
- `npm run test` / `npm run test:run` — vitest (watch / single run); single file: `npx vitest run src/path/to/file.test.ts`
- `npm run lint` / `npm run lint:fix` — ESLint (CI fails on warnings, `--max-warnings 0`)
- `npm run format` / `format:check` — Prettier
- `npm run build` — `tsc && vite build` (CI runs this; type errors fail the build)

Music service (`cd backend/music`, venv lives at `backend/music/env`):
- `source env/bin/activate` (create with `python3 -m venv env && pip install -r requirements.txt`)
- `fastapi dev main.py` — dev server (port 8000)
- `pytest` — full suite with coverage (config in `pytest.ini`); single test: `pytest tests/test_api.py -k name --no-cov`
- `black .` (line length 80) and `flake8` — CI enforces both

Go service (`cd backend/main`):
- `go run main.go` — dev server (port 5001); `air` config exists (`.air.toml`)
- `go test ./...` — tests (CI runs with `-race`); single test: `go test ./tests/ -run TestName`
- `gofmt -s -w .`, `go vet ./...`, golangci-lint — CI enforces all three
- After editing `database/queries/*.sql`: run `sqlc generate` (config `sqlc.yaml`)

Required env vars for local dev are listed in the root `README.md` (DATABASE_URL, JWT_SECRET ≥32 chars, VITE_BACKEND_*, etc.). Migrations run automatically on Go service startup.

A husky pre-commit hook auto-formats staged files (Prettier / Black+flake8 / gofmt) per service.

## Architecture

### Adding an identification game

Games (key signature / interval / scale / chord identification) are declarative. To add one:
1. Python: add a `/music/<name>-game` endpoint (model in `models.py`, logic in `services/music_service.py`, route via the `run_game_endpoint` helper in `routers/api.py`) returning `{ generatedXml, ...answer fields }` + tests.
2. Frontend: write a `GameDefinition` in `frontend/src/features/identification-game/games/` (settings schema, `toRequest` + `fetchQuestion`, `getAnswer`, answer pad options), export it from `games/index.ts`, add a thin page + route + nav link. The question queue keys on the serialized `toRequest` output, so only payload-affecting settings reset it.
3. Add the game id to `backend/main/DTOs/game_types.go` (`ValidGameTypes`) and the TS `GameType` union in `services/api/types/game.types.ts`.
Settings UI, JSONB persistence (`game_settings` table), saved-config sanitization, scoring, and game flow all come from the definition — don't touch shared code.

### Exercise/game flow (the core loop)

1. Frontend page (e.g. `NoteGamePage`) calls the music service through `frontend/src/services/api/music.service.ts` → FastAPI endpoint (e.g. `POST /music/note-game`).
2. FastAPI router (`backend/music/routers/api.py`) delegates to `services/music_service.py` (`MusicService`), which builds a music21 `Stream` and exports it to MusicXML. Game endpoints return JSON `{ generatedXml, ...answer fields }`; the answer stays server-generated and the frontend validates the user's guess against it.
3. `frontend/src/features/sheet-music` (`useOSMD` hook, `SheetMusicDisplay`) renders the MusicXML; `features/note-game-display` handles game-specific rendering.
4. Game state/scoring lives in `frontend/src/features/note-game` hooks (`useNoteGame`, `useNoteQueue`, timers, keyboard input). Results and per-user settings are persisted to the Go service (`note_game_entries`, `note_game_settings`).

### Frontend structure

- Feature-folder layout under `src/features/<feature>/{components,hooks,services,types}` — see `src/features/README.md`. Shared UI/types/hooks in `src/shared/`.
- API layer in `src/services/api/`: two axios clients (`clients/music-client.ts` — no auth; `clients/main-client.ts` — JWT attach + refresh-on-401 interceptors), one service class per domain, mappers for DTO↔domain conversion. See its README for conventions.
- Zustand stores in `src/stores/` (auth, theme, friends); pages in `src/pages/`, routed in `App.tsx`.
- Tabs use hard tabs (Prettier config); path alias `@/` → `src/`.

### Go service structure

Strict controller → service → repository layering (repositories are the sqlc-generated queries):
- `controllers/` — Gin handlers, request binding, routes registered in `main.go`
- `services/` — business logic; `DTOs/` — request/response shapes; `validations/`, `middleware/` (JWT auth), `logger/`
- Tests live both next to services and under `tests/`

### Music service structure

Thin: `main.py` (app + CORS) → `routers/api.py` (endpoints, error mapping: music21/Value/Key errors → 400, everything else → 500) → `services/music_service.py` (all music21 logic, DI via `services/deps.py`). Pydantic models in `models.py`. When adding an exercise type, follow this chain and add tests in `tests/` (pytest markers: unit/integration/snapshot).

## Conventions & gotchas

- music21 uses `-` for flats ("B-"), while the frontend uses `b` ("Bb") — `MusicService.CIRCLE_OF_FOURTHS` keys are music21-style. Watch the conversion at the API boundary.
- Each music21 Note object may appear only once per Stream — transpose from a fresh root per note.
- The `/logical-commit` and `/commit:*` skills exist for this repo's commit style (service-repository pattern, bite-sized commits).
- The paso CLI (`/paso` skill) is used for task tracking on this project.
