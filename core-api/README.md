# Tremolo — Go User-Tracking Service (`backend/main`)

Gin HTTP service (default port **5001**) that handles everything user-related for
[Tremolo](https://tremolonotes.com): authentication (JWT + Google OAuth), users /
teachers / friends, game score entries, per-game settings, keyboard bindings, and
dashboard chart data. Backed by **Postgres** via **sqlc**.

It is one of three services in this repo (see the root `CLAUDE.md`):

- `frontend/` — React SPA; talks to this service via `VITE_BACKEND_MAIN`.
- `backend/music/` — Python FastAPI music-generation service (port 8000, stateless, no auth).
- `backend/main/` — **this service**. The Go and Python services do not talk to each other.

## Running locally

```bash
cd backend/main
go run main.go          # serves on :5001 (override with USER_SERVICE_PORT)
# or use air (config in .air.toml) for hot reload
```

Migrations run **automatically at startup**: `main.go` calls
`database.RunMigrations`, which applies the embedded goose migrations in
`database/migrations/` (`database/migrate.go`, via `pressly/goose/v3` with
`//go:embed`). There is no separate migrate step.

### Required environment variables

The service panics at startup if these are missing or invalid (see the root
`README.md` for a full copy-pasteable env block):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (`postgresql://user:pw@host:port/db`) |
| `JWT_SECRET` | HMAC signing secret — **must be ≥ 32 characters** (`middleware.InitJWTSecret`) |
| `ACCESS_TOKEN_EXPIRY_MINUTES` | Access-token lifetime, e.g. `15` |
| `REFRESH_TOKEN_EXPIRY_HOURS` | Refresh-token lifetime, e.g. `168` (7 days) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials (`services.InitGoogleOAuth`) |

Optional:

| Variable | Purpose |
|---|---|
| `USER_SERVICE_PORT` | Listen port (default `5001`) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (default `http://localhost:5173`) |
| `ACCOUNT_LOCKOUT_DURATION_MINUTES` | Lockout duration after failed logins (default 15; the max-attempts count is the `MaxLoginAttempts` constant in `services/auth_service.go`, currently 5) |
| `LOG_LEVEL` / `LOG_FORMAT` | slog level (`DEBUG`/`WARN`/`ERROR`) and format (`json`/`text`) — `logger/logger.go` |
| `TREMOLO_DATABASE_USER` / `_PW` / `TREMOLO_FIRST_NAME` / `_LAST_NAME` | Only for the fake-data generator (`go run main.go -fake-it`, see `generation/`) |

## Architecture: controller → service → repository

The service uses strict layering. Repositories are the **sqlc-generated
queries** — there is no hand-written repository layer.

```
controllers/   Gin handlers: route groups, request binding, HTTP status mapping.
               Each file exports a Setup*Routes(router) function registered in main.go.
services/      Business logic: validation, authorization checks, DTO conversion.
               Take a generated.Querier (usually database.Queries) as a parameter.
DTOs/          Request/response shapes + their Validate() methods (package dtos).
database/
  database.go       Opens the connection; exposes DBConn (*sql.DB) and
                    Queries (*generated.Queries) as package globals.
  migrate.go        Runs embedded goose migrations at startup.
  migrations/       Numbered goose SQL files (00001_..., 00002_...).
  queries/          Hand-written SQL, one file per table/domain.
  generated/        sqlc output — never edit by hand.
middleware/    JWT auth middleware (token parsing, userID injection).
validations/   Custom validator functions (e.g. time-length format).
logger/        slog setup.
generation/    Fake-data generator behind the -fake-it flag.
tests/         Integration tests + tests/testutil helpers.
```

**Rule:** controllers never call generated queries directly. They only pass
`database.Queries` into service functions
(`services.Foo(ctx, database.Queries, userID, ...)`); all query calls and
business logic live in `services/`. Controllers handle HTTP concerns only:
auth extraction via `middleware.GetAuthenticatedUserID(c)`, JSON binding, and
mapping service errors (`services.ErrValidation`, `services.ErrUnauthorized`)
to status codes.

## Database workflow

Schema and queries are code-generated with **sqlc** (`sqlc.yaml`: engine
`postgresql`, schema read from `database/migrations`, queries from
`database/queries`, output to `database/generated` with `emit_interface: true`,
which produces the `generated.Querier` interface services depend on).

To add a column or a new query:

1. **Migration** — add a new numbered goose file in `database/migrations/`
   (next number, e.g. `00010_my_change.sql`) with `-- +goose Up` and
   `-- +goose Down` sections. Tables live in the `tremolo` schema
   (e.g. `alter table tremolo.note_game_entries ...`).
2. **Query** — add or edit SQL in the matching `database/queries/*.sql` file
   using sqlc annotations (`-- name: GetFoo :one`).
3. **Regenerate** — run `sqlc generate` from `backend/main/`. This rewrites
   `database/generated/` (models, per-file `*.sql.go`, and `querier.go`).
4. Use the new method through the `generated.Querier` interface in a service.
5. Migrations apply automatically the next time the service (or a DB-backed
   test) starts.

Existing query files: `users.sql`, `friends.sql`, `relationships.sql`,
`note_game_entries.sql`, `note_game_settings.sql`, `game_settings.sql`,
`keyboard_bindings.sql`, `seeders.sql`.

## The games domain

### Entries: one table for all games

`note_game_entries` stores results for **every** identification game, not just
the note game (the name is historical). Migration `00007_entry_game_type.sql`
added a `game_type varchar(30) not null default 'note'` discriminator column
plus an index on `(user_id, game_type)`.

- **`dtos.ValidGameTypes`** in `DTOs/game_types.go` is the single source of
  truth for game identifiers: `note`, `key_signature`, `scale`, `chord`,
  `interval`. Entry validation and settings validation both derive from it,
  and the TS `GameType` union in
  `frontend/src/services/api/types/game.types.ts` mirrors it.
- `normalizeGameType` in `services/note_game_service.go` defaults an empty
  `game_type` to `"note"` (legacy clients) and rejects unknown values with
  `ErrValidation`.
- `services.CreateNoteGameEntry` also enforces that the entry's `user_id`
  matches the authenticated JWT user (`ErrUnauthorized` → 403).

### Settings: JSONB for most games, typed columns for the note game

Two tables:

- **`game_settings(user_id, game_type, config jsonb)`** (migration `00008`,
  unique on `(user_id, game_type)`) — per-game settings for every game
  *except* the note game. Valid types are `dtos.ValidSettingsGameTypes`
  (derived as `ValidGameTypes` minus `"note"`). The `config` blob is validated
  only structurally (valid JSON object, ≤ 4096 bytes —
  `dtos.MaxGameSettingsConfigBytes` in `DTOs/game_settings_dto.go`).
- **`note_game_settings`** — typed columns for the note game: game mode,
  time/note limits, scale, octave, and range columns `low_note` / `high_note`
  / `clef` added by migration `00009`. Fully validated field-by-field in
  `DTOs/note_game_settings_dto.go` (e.g. `oneof=time notes`, natural-note
  regex `^[A-G][0-9]$`, `oneof=treble bass`).

The tradeoff: JSONB lets a new game ship its settings with zero backend schema
work (one line in `game_types.go`), at the cost of the server not understanding
the config's shape. The note game predates this pattern and keeps typed columns,
which buys strict server-side validation but requires a migration for every
settings change. Because the server treats JSONB configs as opaque, the
frontend sanitizes saved configs against each game's settings schema on load
(`frontend/src/features/identification-game/settings/sanitizeConfig.ts`), so a
stale or malformed blob degrades to defaults instead of breaking the game.

### Game endpoints

All require a JWT (`Authorization: Bearer <access token>`).

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/note-game/entry` | Save a game result (any game type; body includes `game_type`) |
| GET | `/api/note-game/recent?game_type=` | Last 30 entries for one game type (defaults to `note`) |
| GET | `/api/note-game/activity` | Per-day game counts for the activity heatmap (last 365 days) |
| GET / PUT | `/api/note-game/settings` | Typed note-game settings |
| GET / PUT | `/api/game-settings?game_type=` | JSONB settings for non-note games (PUT takes `{game_type, config}` in the body; GET returns `{"settings": null}` when none saved) |
| GET / PUT | `/api/note-game/keyboard-bindings` | Per-user keyboard bindings for the note game |

## Full route map

Registered in `main.go` via one `controllers.Setup*Routes` call per domain.

| Method | Path | Auth | Controller file |
|---|---|---|---|
| GET | `/health` | — | `health_controller.go` (DB ping) |
| POST | `/api/auth/login`, `/register`, `/refresh` | — | `auth_controller.go` |
| GET | `/api/auth/me` | JWT | `auth_controller.go` |
| POST | `/api/auth/google/callback` | — | `auth_controller.go` |
| POST | `/api/auth/google/link` | JWT | `auth_controller.go` |
| GET | `/teachers`, `/teacher/:id`, `/students`, `/student/:id`; POST `/user` | — | `controller.go` (legacy teacher/user routes) |
| GET | `/api/charts/user/:userId/metrics?interval=&days=` | JWT | `chart_controller.go` |
| GET | `/api/charts/teacher/class-metrics?interval=&days=` | JWT | `chart_controller.go` |
| GET | `/api/users/:userId/general-info` | JWT (own data only) | `user_info_controller.go` |
| GET / POST | `/api/friends`, GET `/api/friends/search?q=` | JWT | `friends_controller.go` |
| GET / POST | `/api/classes` (teacher's classes / create), POST `/api/classes/join`, GET `/api/classes/joined` | JWT | `class_controller.go` |
| GET / DELETE | `/api/classes/:id/roster`, DELETE `/api/classes/:id` (archive), `/api/classes/:id/students/:studentId` | JWT (role/ownership in service) | `class_controller.go` |
| GET / POST | `/api/classes/:id/assignments`; GET `/api/assignments` (student view), `/api/assignments/:id/results` (teacher grid); DELETE `/api/assignments/:id` | JWT | `class_controller.go` |
| * | game endpoints (table above) | JWT | `note_game_*`, `game_settings_`, `keyboard_bindings_controller.go` |

Chart endpoints accept `interval` = `day`/`week`/`month`/`year` (strategy
pattern in `services/chart_strategies.go`) and `days` (default 30).

## Auth flow (brief)

- **Login/Register** (`services/auth_service.go`): bcrypt-hashed passwords,
  account lockout after `MaxLoginAttempts` (5) failed attempts for
  `ACCOUNT_LOCKOUT_DURATION_MINUTES`. Successful auth returns a short-lived
  **access token** and a long-lived **refresh token** (both HS256 JWTs with a
  `token_type` claim, signed with `JWT_SECRET`).
- **Middleware** (`middleware/auth_middleware.go`): `AuthMiddleware()` parses
  the `Bearer` token, verifies HMAC signing + `token_type == "access"`, and
  puts `userID` on the Gin context; handlers read it with
  `GetAuthenticatedUserID(c)`.
- **Refresh**: `POST /api/auth/refresh` validates a refresh token and mints a
  new access token. (The frontend's `main-client.ts` axios interceptor does
  refresh-on-401 automatically.)
- **Google OAuth**: frontend sends the authorization code to
  `POST /api/auth/google/callback`; the service exchanges it, verifies the ID
  token (`services/google_token_verifier.go`, swappable via
  `SetTokenVerifier` for tests), then logs in an existing Google user, links,
  or creates one. `POST /api/auth/google/link` links Google to an existing
  logged-in account. **Full details: [`docs/google-oauth-flow.md`](../../docs/google-oauth-flow.md).**

## Testing

```bash
go test ./...                          # everything
go test ./tests/ -run TestName         # single test
```

- **DB-backed tests skip, not fail, without `DATABASE_URL`** —
  `testutil.SetupTestDB(t)` calls `t.Skip` when it's unset, so unit tests
  still run anywhere.
- `tests/testutil/db.go` conventions:
  - `SetupTestDB(t)` — idempotent (sync.Once) connection + migrations.
  - `CreateTestUser(t, params)` / `CreateTestUserWithDefaults(t, email, role)` —
    create a real user (hashed password, role lookup, default keyboard
    bindings) and **register `t.Cleanup` to delete it** and its related rows
    (`DeleteTestUser` removes entries, bindings, teacher/student links, then
    the user).
  - `CreateTestNoteGameEntry(t, params)` — seed a game entry
    (`GameType` defaults to `"note"`).
- Tests live both next to services (`services/*_test.go`) and under `tests/`.
- CI (`.github/workflows/backend-go.yml`) spins up Postgres 16 and runs
  `gofmt -s` (fails on any unformatted file), `go vet ./...`, `golangci-lint`,
  and `go test -race` with coverage.

## How to add things

### A new endpoint

1. Write the service function in `services/` taking
   `(ctx, q generated.Querier, userID, ...)`; add queries via the
   [database workflow](#database-workflow) if needed.
2. Define request/response DTOs (with a `Validate()` method) in `DTOs/`.
3. Add the handler + route in the relevant `controllers/*_controller.go`
   `Setup*Routes` group (attach `middleware.AuthMiddleware()` for protected
   routes). If it's a new domain, create a new controller file and register
   its `SetupXRoutes(router)` in `main.go`.
4. Add tests (service-level in `services/` or `tests/`, using `testutil`).

### A new identification game type

The Go side is intentionally one line — the full cross-service recipe is in
the root `CLAUDE.md` ("Adding an identification game"):

1. Add the game id to `ValidGameTypes` in `DTOs/game_types.go`. That's it —
   entry storage (`note_game_entries.game_type`) and JSONB settings
   (`game_settings`) pick it up automatically via `ValidSettingsGameTypes`.
2. Mirror it in the TS `GameType` union
   (`frontend/src/services/api/types/game.types.ts`).
3. Frontend `GameDefinition` + Python music-service endpoint per `CLAUDE.md`.
