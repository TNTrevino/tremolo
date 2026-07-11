# backend/main — agent notes

Gin + Postgres user-tracking service. **Read `README.md` here before
structural changes** — full route map, env vars, and games-domain details.

Invariants:

- Strict layering: controller → service → sqlc-generated queries. Controllers
  never import `database/generated`; services receive `generated.Querier`.
- Database changes: new numbered goose file in `database/migrations/` (never
  edit an existing one — they run automatically at startup), queries in
  `database/queries/*.sql`, then `sqlc generate`. Never hand-edit
  `database/generated/`.
- `dtos.ValidGameTypes` (`DTOs/game_types.go`) is the single source of truth
  for game identifiers; `ValidSettingsGameTypes` derives from it. A new game
  is one entry here + the TS `GameType` union.
- All games' scores live in `note_game_entries` with a `game_type`
  discriminator (empty string normalizes to `"note"`). Per-game settings:
  JSONB `game_settings` for every game EXCEPT the note game (typed
  `note_game_settings`). The frontend sanitizes JSONB configs on load — the
  Go side only checks "JSON object ≤ 4KB, valid game_type".

Workflow: `go test ./...` (DB tests skip without DATABASE_URL; use a
throwaway DB, never the dev one), `gofmt -s -w .`, `go vet ./...`; CI adds
golangci-lint and `-race`.
