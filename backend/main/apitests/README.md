# Tremolo API tests (kulala)

Scripted, assertion-based API tests for the Go service (`backend/main`),
run with the [kulala CLI](https://github.com/mistweaverco/kulala-cli).
More readable than a wall of `curl`, and every step asserts.

## Files

- `http-client.env.json` — environments. `local` points `base_url` at
  `http://localhost:5001` and holds the shared test `password`.
- `auth.http` — register + login smoke test with token-shape assertions.
- `classes.http` — the classes/assignments feature end to end: teacher
  and students register and log in, a class is created and joined by
  code, an assignment is set, an attempt is submitted, and both the
  student progress view and the teacher results grid are read back —
  with the authorization checks (403/404/400) interleaved.

## Running

Start the Go service first (it listens on `:5001` and runs migrations
on startup):

```bash
cd backend/main && go run main.go
```

Then, from this directory (`backend/main/apitests`):

```bash
kulala run --tests --env local auth.http
kulala run --tests --env local classes.http
```

`--tests` prints only the assertion results (full request/response
output on failure). Run both at once with `kulala run --tests --env
local .`, or a single block with `--name CREATE_CLASS`. `--halt` stops
at the first failure.

`base_url` is per-environment in `http-client.env.json`, so CI can point
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
