# Tremolo — Go User-Tracking Service (`core-api`)

`net/http` service (default port **5001**) that handles everything user-related for
[Tremolo](https://tremolonotes.com): authentication (JWT + Google OAuth), users /
teachers / friends, game score entries, per-game settings, keyboard bindings, and
dashboard chart data. Backed by **Postgres** via **sqlc**.

It is one of three services in this repo (see the root `CLAUDE.md`):

- `frontend/` — React SPA; talks to this service via `VITE_BACKEND_MAIN`.
- `music-api/` — Python FastAPI music-generation service (port 8000, stateless, no auth).
- `core-api/` — **this service**. The Go and Python services do not talk to each other.

## Running locally

```bash
cd core-api
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
| `LOG_LEVEL` / `LOG_FORMAT` | slog level (`DEBUG`/`INFO`/`WARN`/`ERROR`) and format — `logger/logger.go`. `json` for deployed machines, `text` for plain logfmt, anything else (including unset) for the readable [charm](https://charm.land/log/v2) output |
| `LOG_SQL_ARGS` | `true` adds query arguments to each query log line (`database/query_logger.go`). Off by default — arguments carry email addresses, reset tokens and password hashes |
| `LOG_SQL_TEXT` | `true` prints the whole statement under each query log line, with sqlc's `-- name:` header stripped because `name=` already carries it. Off by default for volume, not for secrecy |
| `CLICOLOR_FORCE` | `1` keeps the colour when the output is piped. charm calls `colorprofile.Detect` once at startup and strips every escape when stdout is not a terminal, so `air` (and `\| tee`) produce plain text without this. `NO_COLOR` overrides it |
| `TREMOLO_DATABASE_USER` / `_PW` / `TREMOLO_FIRST_NAME` / `_LAST_NAME` | Only for the fake-data generator (`go run main.go -fake-it`, see `generation/`) |
| `PUBLIC_BASE_URL` | Origin every link in an outbound email is built on (default `http://localhost:4200`). Deliberately not derived from `ALLOWED_ORIGINS` — that list holds prod and QA together |
| `EMAIL_SMTP_HOST` | SMTP relay hostname. **Unset means email is disabled**: the service still boots and mail still queues, the watcher just holds it |
| `EMAIL_SMTP_PORT` | Relay port (default `587`; anything unparseable falls back to `587`) |
| `EMAIL_SMTP_USER` / `EMAIL_SMTP_PASSWORD` | SMTP AUTH PLAIN credentials. STARTTLS is mandatory, so these never travel in the clear |
| `EMAIL_FROM` | Sender address, and the domain the Message-ID is built from. **Unset means email is disabled**, same as a missing host |
| `EMAIL_FROM_NAME` | Sender display name, also the app name in the templates (default `Tremolo`) |
| `EMAIL_SEND_TIMEOUT_SECONDS` | Bound on one delivery attempt (default `20`) |
| `EMAIL_WATCHER_INTERVAL_SECONDS` | Gap between queue drains (default `30`) |
| `EMAIL_BATCH_SIZE` | Messages one drain claims (default `10`) |
| `EMAIL_MAX_ATTEMPTS` | Tries before a message is marked dead (default `5`; retries back off from 60s, doubling, capped at 1h) |
| `EMAIL_CLAIM_LEASE_SECONDS` | How long a claim survives before another watcher may take the row back (default `300`) |
| `REQUIRE_EMAIL_VERIFICATION` | Gate `Login` on `users.email_verified_at` being set (default `false`/unset — soft for the pilot: signup still mails a verify link and an unverified user still sees a frontend banner, but sign-in is never blocked) |

Email is off unless **both** `EMAIL_SMTP_HOST` and `EMAIL_FROM` are set.
With either missing, startup logs one warning naming what is absent and the
queue holds: rows are written as usual, and the watcher declines to claim
them rather than burning attempts against a relay that is not there.

## Architecture: controller → service → repository

The service uses strict layering. Repositories are the **sqlc-generated
queries** — there is no hand-written repository layer.

```
main.go        run(ctx, args): dependency init, then an http.Server with
               timeouts and graceful shutdown.
server.go      NewServer(allowedOrigins, q) http.Handler: the mux plus the
               middleware chain, outside-in Recover → RequestLog → CORS.
controllers/   net/http handlers: route registration, request binding, HTTP status mapping.
               Each file exports a RegisterXRoutes(mux, q) function, listed in
               controllers/routes.go.
services/      Business logic: authorization checks, DTO conversion. Take a
               generated.Querier (usually database.Queries) as a parameter.
               Request bodies arrive already validated (see Validation below).
DTOs/          Request/response shapes + their Valid() methods (package dtos).
httpx/         M, JSON, Decode and DecodeValid — the request and response
               helpers shared by every handler.
database/
  database.go       Opens the connection; exposes DBConn (*sql.DB) and
                    Queries (*generated.Queries) as package globals, plus the
                    Querier alias controllers use to name the type.
  migrate.go        Runs embedded goose migrations at startup.
  migrations/       Numbered goose SQL files (00001_..., 00002_...).
  queries/          Hand-written SQL, one file per table/domain.
  generated/        sqlc output — never edit by hand.
middleware/    RequireAuth (JWT parsing, typed-context-key userID injection),
               CORS, Recover, RequestLog.
validations/   Plain func(string) bool rules (e.g. time-length format,
               password complexity) that the DTOs' Valid() methods call, and
               the query-parameter helpers in http_params.go.
logger/        slog setup.
generation/    Fake-data generator behind the -fake-it flag.
tests/         Integration tests + tests/testutil helpers.
```

**Rule:** controllers never call generated queries directly. A handler maker
receives a `database.Querier` and passes it straight through
(`services.Foo(r.Context(), q, userID, ...)`); all query calls and business
logic live in `services/`. The Querier comes from `NewServer` via
`controllers.RegisterRoutes`, so no handler reads `database.Queries` as a
global. Controllers handle HTTP concerns only: auth extraction via
`middleware.AuthenticatedUserID(r)`, JSON decoding (`httpx.Decode`), and
mapping service errors (`services.ErrValidation`, `services.ErrUnauthorized`)
to status codes.


## Validation

Request bodies validate themselves. Each request DTO carries a

```go
Valid(ctx context.Context) (problems map[string]string)
```

method returning its problems keyed by JSON field name. An empty map means
the body is valid. The pattern is the one in Mat Ryer's "How I write HTTP
services in Go after 13 years".

Controllers call `httpx.DecodeValid[T]`, which decodes the body and runs
`Valid` in one step. Its `[T Validator]` type constraint is the point: a
request shape without a `Valid` method is a build error, not a body that
quietly skips validation. `httpx.Decode[T]` remains for a body that needs
no rules at all; no route uses it today, since every request shape has a
`Valid` method.

A failure comes back as a problems map plus an error. `httpx.DecodeError`
renders it as the `{"error": "..."}` body the API has always returned,
sorting the keys so two identical requests cannot answer in two different
orders. Two routes map their own errors instead, because their responses
differ: `POST /user` answers 422 with extra `message` and `scenario` keys,
and `POST /api/auth/refresh` answers one message for both a malformed body
and a missing token.

Services take already-valid input. They do not re-check request shapes.

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
3. **Regenerate** — run `sqlc generate` from `core-api/`. This rewrites
   `database/generated/` (models, per-file `*.sql.go`, and `querier.go`).
4. Use the new method through the `generated.Querier` interface in a service.
5. Migrations apply automatically the next time the service (or a DB-backed
   test) starts.

Existing query files: `users.sql`, `account.sql`, `friends.sql`,
`relationships.sql`, `note_game_entries.sql`, `note_game_settings.sql`,
`game_settings.sql`, `keyboard_bindings.sql`, `classes.sql`,
`assignments.sql`, `teacher_invites.sql`, `seeders.sql`.

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
  `DTOs/note_game_settings_dto.go` (game mode is `time` or `notes`, the
  natural-note regex `^[A-G][0-9]$`, clef is `treble` or `bass`).

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

Each domain registers its own routes on the `*http.ServeMux` from a
`RegisterXRoutes(mux, q)` function next to its handlers; `controllers/routes.go`
is the one place listing which domains exist. Route patterns carry a method
and use `net/http`'s `{param}` syntax, e.g. `GET /teacher/{id}`.

| Method | Path | Auth | Controller file |
|---|---|---|---|
| GET | `/health` | — | `health_controller.go` (DB ping) |
| POST | `/api/auth/login`, `/register`, `/refresh` | — | `auth_controller.go` |
| POST | `/api/auth/forgot-password`, `/reset-password` | — | `auth_controller.go` |
| POST | `/api/auth/verify-email` | — | `auth_controller.go` |
| POST | `/api/auth/resend-verification` | JWT | `auth_controller.go` |
| POST | `/api/auth/confirm-email-change` | — | `account_controller.go` (registered by `RegisterAuthRoutes`, alongside verify-email/reset-password -- see that route's doc comment) |
| GET | `/api/auth/me` | JWT | `auth_controller.go` |
| POST | `/api/auth/google/callback` | — | `auth_controller.go` |
| POST | `/api/auth/google/link` | JWT | `auth_controller.go` |
| GET | `/teachers`, `/teacher/{id}`, `/students`, `/student/{id}`; POST `/user` | JWT (ADMIN role) | `admin_controller.go` (legacy teacher/user routes) |
| GET / POST | `/api/admin/teacher-invites` (list / mint an invite code) | JWT (ADMIN role) | `teacher_invite_controller.go` |
| GET | `/api/charts/user/{userId}/metrics?interval=&days=` | JWT | `chart_controller.go` |
| GET | `/api/charts/teacher/class-metrics?interval=&days=` | JWT | `chart_controller.go` |
| GET | `/api/users/{userId}/general-info` | JWT (own data only) | `user_info_controller.go` |
| PUT | `/api/users/{userId}/password` | JWT (own data only) | `account_controller.go` |
| POST | `/api/users/{userId}/email` | JWT (own data only) | `account_controller.go` |
| GET / POST | `/api/friends`, GET `/api/friends/search?q=` | JWT | `friends_controller.go` |
| GET / POST | `/api/classes` (teacher's classes / create), POST `/api/classes/join`, GET `/api/classes/joined` | JWT | `class_controller.go` |
| GET / DELETE | `/api/classes/{id}/roster`, DELETE `/api/classes/{id}` (archive), `/api/classes/{id}/students/{studentId}` | JWT (role/ownership in service) | `class_controller.go` |
| GET / POST | `/api/classes/{id}/assignments`; GET `/api/assignments` (student view), `/api/assignments/{id}/results` (teacher grid), `/api/assignments/{id}/attempts/{studentId}` (one student's attempts); DELETE `/api/assignments/{id}` | JWT | `class_controller.go` |
| * | game endpoints (table above) | JWT | `note_game_*`, `game_settings_`, `keyboard_bindings_controller.go` |

Chart endpoints accept `interval` = `day`/`week`/`month`/`year` (strategy
pattern in `services/chart_strategies.go`) and `days` (default 30).

## Auth flow (brief)

- **Login/Register** (`services/auth_service.go`): bcrypt-hashed passwords,
  account lockout after `MaxLoginAttempts` (5) failed attempts for
  `ACCOUNT_LOCKOUT_DURATION_MINUTES`. Successful auth returns a short-lived
  **access token** and a long-lived **refresh token** (both HS256 JWTs with a
  `token_type` claim, signed with `JWT_SECRET`).
- **Middleware** (`middleware/auth_http.go`): `RequireAuth` parses the
  `Bearer` token, verifies HMAC signing + `token_type == "access"`, and puts
  the user ID on the request context under an unexported, typed key; handlers
  read it with `middleware.AuthenticatedUserID(r)`.
- **Refresh**: `POST /api/auth/refresh` validates a refresh token and mints a
  new access token. (The frontend's `main-client.ts` axios interceptor does
  refresh-on-401 automatically.)
- **Google OAuth**: frontend sends the authorization code to
  `POST /api/auth/google/callback`; the service exchanges it, verifies the ID
  token (`services/google_token_verifier.go`, swappable via
  `SetTokenVerifier` for tests), then logs in an existing Google user, links,
  or creates one. `POST /api/auth/google/link` links Google to an existing
  logged-in account. **Full details: [`docs/google-oauth-flow.md`](../../docs/google-oauth-flow.md).**

### Teacher invite codes

The TEACHER role grants classes, rosters and other students' scores, so
self-service signup cannot simply ask for it (#250). A registration body
claiming `"role": "TEACHER"` must carry an `invite_code`, and
`services.Register` spends one use of it before the user row exists.

Where that happens inside `Register` is load-bearing: **after** the
email-taken check, so a teacher retrying a signup they already completed
does not burn a second use, and **before** `CreateUser`, so no TEACHER row
can exist that was not gated. A failed `CreateUser` hands the use back
(`releaseTeacherInvite`). Redemption itself is a single conditional UPDATE
(`RedeemTeacherInviteCode`) rather than a select-then-update, so two people
racing the last use of a code cannot both win —
`tests/teacher_invite_service_test.go` races eight signups at one
single-use code to prove it.

Unknown, expired and spent codes all answer the same sentence with a
`"field": "invite_code"` key, which is the only response in this API that
carries a `field`: the signup page reads it to put the message under the
input rather than in the page alert.

Two paths deliberately skip the gate:

- **Google OAuth** needs none. `services/google_auth_service.go` hard-codes
  `BASIC` for a new account, and no query in `database/queries/` updates a
  role, so an OAuth signup cannot reach TEACHER at all.
- **`POST /user`** (admin-created users) bypasses it on purpose. That route
  is already ADMIN-only, so requiring a code there would mean an admin
  minting one to hand to themselves.

Codes are minted by an ADMIN at `POST /api/admin/teacher-invites` (body:
`note`, `max_uses`, `expires_in_days` — all optional; the defaults are one
use and no expiry), or by hand in SQL during the pilot:

```sql
insert into tremolo.teacher_invite_codes (code, note, max_uses)
values ('K7M2QP4R', 'Ms. Rivera, Jefferson MS', 1);
```

```sql
select code, note, use_count, max_uses, expires_at
from tremolo.teacher_invite_codes
order by created_at desc;
```

A hand-written code must be **uppercase** and drawn from the same
unambiguous alphabet generated ones use — A–Z minus `I`, `L`, `O`, plus
2–9 — because a teacher reads it off an email or a whiteboard. The
uppercase half is enforced by a CHECK constraint rather than trusted:
redemption uppercases the submitted code first, so a lowercase row would
otherwise sit in the table permanently unredeemable.

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
- CI (`.github/workflows/core-api.yml`) spins up Postgres 16 and runs
  `go tool gofumpt -l .` (fails on any unformatted file), `go vet ./...`,
  `golangci-lint`, and `go test -race` with coverage.

## How to add things

### A new endpoint

1. Write the service function in `services/` taking
   `(ctx, q generated.Querier, userID, ...)`; add queries via the
   [database workflow](#database-workflow) if needed.
2. Define request/response DTOs in `DTOs/`. Give each request body a
   `Valid(ctx context.Context) map[string]string` method (see Validation
   below) — `httpx.DecodeValid` will not compile without one.
3. Add the handler + route in the relevant `controllers/*_controller.go`
   `RegisterXRoutes` function (wrap the handler with `middleware.RequireAuth`
   for protected routes). If it's a new domain, create a new controller file
   and add its `RegisterXRoutes(mux, q)` call to `controllers/routes.go`.
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
