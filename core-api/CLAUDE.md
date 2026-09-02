# core-api — agent notes

`net/http` + Postgres user-tracking service. **Read `README.md` here before
structural changes** — full route map, env vars, and games-domain details.

Invariants:

- Strict layering: controller → service → sqlc-generated queries. Controllers
  never import `database/generated`; services receive `generated.Querier`.
  A controller may name `database.Querier` — the alias in
  `core-api/database/database.go` exists precisely so a handler can take one
  as a parameter without importing `database/generated`.
- Request bodies validate themselves. Every request DTO has a
  `Valid(ctx context.Context) map[string]string` method returning problems
  keyed by JSON field name, and controllers call `httpx.DecodeValid`, which
  decodes and validates in one step. The `[T Validator]` constraint on that
  function makes a request shape without a `Valid` method a build error.
  Services take already-valid input and do not re-check request shapes.
  Rules live in `validations/` as plain `func(string) bool`. There is no
  validation framework and no `validate:` struct tags — do not add either.
- Database changes: new numbered goose file in `database/migrations/` (never
  edit an existing one — they run automatically at startup), queries in
  `database/queries/*.sql`, then `sqlc generate`. Never hand-edit
  `database/generated/`.
- A TEACHER row reaches the database through exactly two routes:
  `POST /api/auth/register` with an invite code the request redeems, and
  admin-only `POST /user`. Google OAuth always creates BASIC
  (`services/google_auth_service.go` hard-codes it) and no query in
  `database/queries/` updates a role, so there is no third way in over
  HTTP. (`go run main.go -fake-it` writes rows directly via
  `CreateUserWithPassword`; it is a dev seeder, not a route.) Adding a
  route means adding the gate too — see the README's "Teacher invite
  codes".
- `dtos.ValidGameTypes` (`DTOs/game_types.go`) is the single source of truth
  for game identifiers; `ValidSettingsGameTypes` derives from it. A new game
  is one entry here + the TS `GameType` union.
- All games' scores live in `note_game_entries` with a `game_type`
  discriminator (empty string normalizes to `"note"`). Per-game settings:
  JSONB `game_settings` for every game EXCEPT the note game (typed
  `note_game_settings`). The frontend sanitizes JSONB configs on load — the
  Go side only checks "JSON object ≤ 4KB, valid game_type".

Workflow: `go test ./...` (DB tests skip without DATABASE_URL; use a
throwaway DB, never the dev one), `go tool gofumpt -w .`, `go vet ./...`; CI
adds golangci-lint and `-race`. gofumpt supersedes `gofmt -s` and also splits
imports into a stdlib group and the rest; it is pinned as a `tool` directive
in `go.mod`, alongside goimports and swag.
