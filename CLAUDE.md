# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Tremolo (tremolonotes.com) is a music-education practice app (competitor to musictheory.net) for 6th–12th grade students. It is three services in one repo:

- `frontend/` — Angular 22 + TypeScript SPA (standalone components, zoneless change detection, signals, RxJS, Tailwind). Renders MusicXML with OpenSheetMusicDisplay (OSMD). Migrated from React in 2026; the record is in `frontend/.migration/`.
- `music-api/` — Python FastAPI "music generation" microservice (port 8000). Uses **music21** to generate exercises and returns MusicXML (plus answer metadata for games). Stateless, no auth.
- `core-api/` — Go (`net/http`) "user tracking" microservice (port 5001). Auth (JWT + Google OAuth), users/teachers/friends, game settings, score entries, dashboard charts. Postgres via **sqlc** (queries in `database/queries/`, generated code in `database/generated/`, goose-style migrations in `database/migrations/`).

The frontend talks to both services directly, through `environment.coreApi` and `environment.musicApi` in `frontend/src/environments/`. The Go and Python services do not talk to each other.

Deep per-service docs (read before structural changes in a service): `frontend/ARCHITECTURE.md`, `core-api/README.md`, `music-api/README.md`. Each service also has its own `CLAUDE.md` with that service's invariants. The frontend additionally has `frontend/DESIGN.md` (visual source of truth) and `frontend/CLASSES_FRONTEND.md` (the teacher tier).

## Commands

A root `Makefile` wraps the commands below per service — prefer these over the raw commands (no `cd`/venv-activation needed): `make test|lint|format|check` (all services) or `make {test,lint,format,check}-{frontend,music,go}` (single service, e.g. `make test-music`). Run `make help` for the full list.

Frontend (`cd frontend`). **Node 24 first** — Angular 22 accepts `^22.22.3 || ^24.15.0 || >=26.0.0` and nothing else, `.nvmrc` pins 24, and nvm lives at `~/.config/nvm`:
`export NVM_DIR="$HOME/.config/nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24`

- `npm run dev` / `npm start` — `ng serve` (port 4200; `-- --port 4300` for a second one)
- `npm run test` / `npm run test:run` — `ng test` (watch / single run); single file: `npx ng test --include src/path/to/file.spec.ts`
- `npm run lint` / `npm run lint:fix` — `ng lint` (CI fails on warnings, `--max-warnings 0`)
- `npm run format` / `format:check` — Prettier
- `npm run build` — `ng build`, output `dist/tremolo-frontend/browser/` (CI runs this; type errors fail it)
- `npm run e2e` — Playwright against a running server: `E2E_BASE_URL=http://localhost:4300 npm run e2e`. Needs both backends up; not in CI.

Music service (`cd music-api`, venv lives at `music-api/env`):

- `source env/bin/activate` (create with `python3 -m venv env && pip install -r requirements.txt`)
- `fastapi dev main.py` — dev server (port 8000)
- `pytest` — full suite with coverage (config in `pytest.ini`); single test: `pytest tests/test_api.py -k name --no-cov`
- `black .` (line length 80) and `flake8` — CI enforces both

Go service (`cd core-api`):

- `go run main.go` — dev server (port 5001); `air` config exists (`.air.toml`)
- `go test ./...` — tests (CI runs with `-race`); single test: `go test ./tests/ -run TestName`
- `go tool gofumpt -w .`, `go vet ./...`, golangci-lint — CI enforces all three. gofumpt (a superset of `gofmt -s`), goimports and swag are `tool` directives in `go.mod`, so `go tool <name>` needs no install
- After editing `database/queries/*.sql`: run `sqlc generate` (config `sqlc.yaml`)

Required env vars for local dev are listed in the root `README.md` (DATABASE_URL, JWT_SECRET ≥32 chars, etc.). The frontend is the exception: it reads no env vars locally — its config is `frontend/src/environments/environment.ts`. The `VITE_*` names survive in `/etc/tremolo/.env` on deployed machines only, where `deploy.yml` uses them to generate `environment.prod.ts`. Migrations run automatically on Go service startup.

A pre-commit hook auto-formats staged files (Prettier / Black+flake8 / goimports+gofumpt) per service. Activate it once per clone with `make hooks`.

## Architecture

### Adding an identification game

Games (key signature / interval / scale / chord identification) are declarative. To add one:

1. Python: add a `/music/<name>-game` endpoint (model in `models.py`, logic in `services/music_service.py`, route via the `run_game_endpoint` helper in `routers/api.py`) returning `{ generatedXml, ...answer fields }` + tests.
2. Frontend: write a `GameDefinition` in `frontend/src/app/features/identification-game/games/` — a plain `.ts` constant, no component. It carries the settings schema, `toRequest`, an **`Observable`**-returning `fetchQuestion(request, music)`, `getAnswer` and the answer-pad options. Export it from `games/index.ts`, then add a thin page component, a route in `src/app/app.routes.ts` (routes are inlined there; there are no `*.routes.ts` files) and a nav link. The question queue keys on `JSON.stringify(toRequest(settings))`, so only payload-affecting settings reset it — a setting that changes the request but skips `toRequest` serves stale questions.
3. Add the game id to `core-api/DTOs/game_types.go` (`ValidGameTypes`) and the TS `GameType` union in `frontend/src/app/shared/models/game.models.ts`. To make it assignable by a teacher, add it to `GAME_DEFINITIONS` too.
   Settings UI, JSONB persistence (`game_settings` table), saved-config sanitization, scoring, and game flow all come from the definition — don't touch shared code.

`fetchQuestion` takes `MusicService` as an argument rather than calling `inject()`: the queue invokes it inside a `switchMap`, which is not an injection context, and `inject()` there throws NG0203.

### Exercise/game flow (the core loop)

1. Frontend page (e.g. `NoteGamePageComponent`) calls the music service through `frontend/src/app/shared/services/music.service.ts` → FastAPI endpoint (e.g. `POST /music/note-game`).
2. FastAPI router (`music-api/routers/api.py`) delegates to `services/music_service.py` (`MusicService`), which builds a music21 `Stream` and exports it to MusicXML. Game endpoints return JSON `{ generatedXml, ...answer fields }`; the answer stays server-generated and the frontend validates the user's guess against it.
3. `frontend/src/app/features/sheet-music/` renders the MusicXML: `<app-sheet-music>` wraps the OSMD instance, `<app-sheet-music-display>` is the card around it, and `<app-game-staff>` is the game-side reuse of the wrapper.
4. Game state and scoring live in `frontend/src/app/features/identification-game/services/` — `GameStateService`, `GameTimerService`, `GameScoreSaverService` and `QuestionQueueService`. The note game **composes** that engine rather than forking it: `NoteGameService` owns the settings, audio and keyboard stream and forwards the rest to `GameStateService`. Results and per-user settings persist to the Go service (`note_game_entries`, `note_game_settings`).

### Frontend structure

- Feature-folder layout under `src/app/features/<feature>/{components,models,services}`; cross-cutting code in `src/app/core/` and `src/app/shared/`; auth in `src/app/auth/`; marketing pages in `src/app/public/`.
- API layer: one `HttpClient` with exactly two interceptors registered in `app.config.ts` — `authInterceptor` attaches the bearer token, `refreshInterceptor` sits closer to the backend and retries a 401 once after refreshing (deduped with `shareReplay` + `finalize`). Which backend a request goes to is decided at the service, which interpolates an absolute base URL from `environment`; nothing rewrites URLs in flight. (`core/interceptors/api-url.ts` is a helper module of predicates, not a registered interceptor.) One service class per domain, all returning `Observable<T>`, with mappers for DTO↔domain conversion. snake_case stops at the mapper.
- Reads go through `rxResource`; mutations are a one-shot `.subscribe()`. **Branch on `status() === "loading"`, never `isLoading()`** — Angular's is also true while reloading and tears children down mid-refetch — and guard every `resource.value()` behind an `error()` arm, because reading it on a failed resource rethrows.
- Signal stores for client state (`AuthStore`, `ThemeStore`, `FriendsUiStore`). Routes are inlined in `src/app/app.routes.ts`.
- Hard tabs (Prettier config); path aliases `@app/ @core/ @shared/ @features/`.
- Unit-test config lives in `angular.json` under `@angular/build:unit-test` — there is no `vitest.config.ts`. `"isolate": true` there is load-bearing.
- Take data (constants, enums, model types, game definitions) from `@features/identification-game/data`, and components/services from `@features/identification-game`. The barrel reaches OSMD; the data entry point does not.

### Go service structure

Strict controller → service → repository layering (repositories are the sqlc-generated queries):

- `controllers/` — `net/http` handlers, request binding, one `RegisterXRoutes` per domain, listed in `controllers/routes.go`
- `services/` — business logic; `DTOs/` — request/response shapes; `validations/`, `middleware/` (JWT auth), `logger/`
- Tests live both next to services and under `tests/`

### Music service structure

Thin: `main.py` (app + CORS) → `routers/api.py` (endpoints, error mapping: music21/Value/Key errors → 400, everything else → 500) → `services/music_service.py` (all music21 logic, DI via `services/deps.py`). Pydantic models in `models.py`. When adding an exercise type, follow this chain and add tests in `tests/` (pytest markers: unit/integration/snapshot).

## Conventions & gotchas

- music21 uses `-` for flats ("B-"), while the frontend uses `b` ("Bb") — `MusicService.CIRCLE_OF_FOURTHS` keys are music21-style. The frontend converts in `shared/utils/music.mapper.ts` and only `shared/services/music.service.ts` may call it: feature code never sees a `"-"` flat, and no component re-converts.
- Each music21 Note object may appear only once per Stream — transpose from a fresh root per note.
- The `/logical-commit` and `/commit:*` skills exist for this repo's commit style (service-repository pattern, bite-sized commits).
- The paso CLI (`/paso` skill) is used for task tracking on this project.
