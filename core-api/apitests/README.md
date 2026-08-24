# Tremolo API tests (kulala)

Scripted, assertion-based API tests for the Go service (`core-api`),
run with the [kulala CLI](https://github.com/mistweaverco/kulala-cli).
More readable than a wall of `curl`, and every step asserts.

## Files

One `.http` file per endpoint, kebab-case, grouped into a directory per
URL path segment — 40 files for the 40 routes in
`core-api/controllers/routes.go`. Directory walking is fully recursive
(kulala picks up every `.http`/`.rest` file at any depth), and
`http-client.env.json` resolution walks upward from each file's own
directory, so one env file at this root covers every nested group —
there is no per-group `http-client.env.json`.

- `http-client.env.json` — environments. `local` points `baseUrl` at
  `http://localhost:5001` and holds the shared test `password`. The
  camelCase spelling is not a style choice: kulala's OpenAPI explorer
  looks up that exact name for the server URL, so every file uses it
  rather than carrying a second copy under a snake_case name.
- `spec.http` — opens `../openapi/swagger.json` in kulala's OpenAPI
  explorer. Not a test: it is a browsable route list for every endpoint
  below, handy when you're not sure which group a route landed in.
- `health/` — the service health check.
- `auth/` — register, login, refresh, `/me`, and the two Google OAuth
  routes. `google-callback.http` and `google-link.http` make a real
  outbound call to Google's token endpoint with a garbage code to prove
  the 401 path — the suite's only external network dependency.
- `admin/` — teacher/student listing and lookup, and admin-created
  users. ADMIN-only, and there is no self-service way to become an
  ADMIN, so every file here asserts only 401 (unauthenticated) and 403
  (authenticated, wrong role). The 200 paths are covered by
  `core-api/tests/admin_controller_test.go` and
  `admin_service_test.go`, which seed an ADMIN row directly in the test
  database.
- `charts/` — dashboard chart data, per-user and per-teacher-class.
- `users/` — a user's own profile summary.
- `note-game/` — the note game's score entries, recent-entry list,
  activity heatmap, typed per-user settings, and keyboard bindings.
- `game-settings/` — the generic JSONB settings blob shared by every
  identification game except the note game (which has its own typed
  endpoints above).
- `friends/` — friend list, user search, and adding a friend.
- `classes/` — class CRUD, joining, rosters, and the assignments nested
  under a class.
- `assignments/` — a student's own assignment list, and the
  teacher-facing results/attempts/delete routes addressed by
  assignment id directly (not nested under a class path).

Every request block's exact-string assertions were verified against a
live instance of this service — see the block's doc comment for the
source (a DTO's `Valid()` method, a service-layer error, or an
inherited quirk worth knowing about) whenever the behavior isn't
self-evident from the endpoint alone.

## Running

Start the Go service first (it listens on `:5001` and runs migrations
on startup):

```bash
cd core-api && go run main.go
```

Then, from this directory (`core-api/apitests`):

```bash
kulala run --tests --env local auth/register.http
kulala run --tests --env local classes/create-assignment.http
```

`--tests` prints only the assertion results (full request/response
output on failure). Run the whole suite at once with `kulala run
--tests --env local .` (recursive), or a whole group with `kulala run
--tests --env local classes/`. `--name` only accepts a single `.http`
file, not a directory (`--name and --line require a single .http or
.rest file path`), so run one block by naming its file directly, e.g.
`kulala run --tests --env local --name CreateClass
classes/create-class.http`. `--halt` stops at the first failure.

`make test-api` from the repo root wraps the whole suite, but does not
just run `.`: it loops `kulala run --tests --halt --env local` over
each group directory (`for dir in */`), stopping at the first
directory that fails. That is deliberate, not incidental — see below.

Running `.` by hand also picks up `spec.http`, which the CLI cannot run
(it is an editor directive, not a request) and reports as
`"../openapi/swagger.json" cannot be parsed as a URL`. That line is
noise, not a test failure — it carries no assertions, and every real
assertion in the suite still runs and is reported. It does, however,
make the process exit non-zero (verified live: 0 failed assertions,
exit code 1), which used to mean `make test-api` failed CI's api-smoke
job even when every assertion passed. `make test-api` no longer runs
`.` for exactly this reason (the per-directory loop above never touches
`spec.http`, since `*/` only matches directories); this paragraph is
only a heads-up for anyone running `.` directly from a shell or editor.

`baseUrl` is per-environment in `http-client.env.json`, so CI can point
it elsewhere by selecting a different env (e.g. `--env ci`).

## How it works (worth knowing before you edit)

- **Post-response scripts** (`> {% ... %}`) are **JavaScript**, not Lua.
  `response.status` is the numeric code; `response.body` is the parsed
  JSON. Assert with `client.test("name", () => { client.assert(cond,
  "msg"); })`.
- **Chaining** uses `client.global.set("k", v)` / `client.global.get("k")`.
  Tokens and ids are stashed as each response comes back and read by
  later requests (`Authorization: Bearer {{teacher_token}}`).
- **Globals persist across runs** in `~/.local/share/kulala-core/
  kulala.db`. The first block of each file calls `client.global.clear()`
  in a pre-response script (`< {% ... %}`) so every run is hermetic — a
  stale token from a previous run can't mask a failure in this one.
- **Unique data**: account emails use `{{$timestamp}}`, so the files are
  repeatable against a persistent database without collisions. Login
  reads the real stored email back from a `*_login_email` global rather
  than regenerating it (dynamic variables re-evaluate on every
  reference).

The suite is self-contained: it creates its own users each run, so it
needs only a running service and a reachable database.
