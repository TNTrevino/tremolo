# Music API tests (kulala)

Scripted, assertion-based HTTP tests for the Python service (`music-api`),
run with the [kulala CLI](https://github.com/mistweaverco/kulala-cli). Same
tool and conventions as `core-api/apitests` — see that directory's README for
the mechanics of `> {% ... %}` scripts, `client.test`/`client.assert`, and
`http-client.env.json`'s `baseUrl` lookup. This suite is simpler in one way
and trickier in another: there is no auth and no chaining (every request is
independent, so there is nothing here like `core-api/apitests`'s token
handoff between blocks), but the status-code contract genuinely varies by
field and is easy to get backwards from reading the code alone.

## Files

- `http-client.env.json` — `local` points `baseUrl` at
  `http://localhost:8000`. No shared `password` entry: the service has no
  auth.
- `music/` — one file per route (`GET /music/health`, `POST /music/mary`,
  `/random`, `/note-game`, `/key-signature-game`, `/scale-game`,
  `/chord-game`, `/interval-game`), matching `core-api/apitests`'s
  one-file-per-endpoint layout.

## Running

Start the service first (no database, no env vars required):

```bash
cd music-api && source env/bin/activate && fastapi dev main.py
```

Then, from this directory (`music-api/apitests`):

```bash
kulala run --tests --env local music/get-health.http
```

Run the whole suite at once with `kulala run --tests --env local .`
(directory walking is recursive), or a single block with `--name
NoteGame`. `--halt` stops at the first failure. `make test-api-music` from
the repo root wraps this.

## The 400-vs-422 boundary (read this before adding a case)

Every negative test in this suite was verified against a live run of the
service — the boundary between FastAPI's own schema validation (422) and
the handler's music21-level error mapping (400) depends on how each field
is typed, and guessing from the model definitions alone gets it wrong more
than once:

- A field typed as a Pydantic `Literal` (e.g. `clef` on every game input,
  `scaleTypes`, `qualities`) rejects an out-of-repertoire value **before**
  the handler runs — **422**, `{"detail": [...]}`, even though the same
  kind of bad value on a plain `List[str]` field (e.g. `intervals`, which
  has no `Literal` constraint) reaches music21's own parser and comes back
  as the handler's **400** `"something is not right!<detail>"` instead.
- A list field's `min_length=1` constraint is also a 422, distinct from an
  empty *result* of a valid request (e.g. an empty note range from
  `lowNote`/`highNote`), which is a 400 raised explicitly in
  `MusicService.get_note_game`.
- `key-signature-game`'s `keySignatures` field is `List[int]` with a
  `@field_validator`, not a `Literal` — an out-of-range value is still a
  422 (Pydantic runs the validator during schema parsing), but the message
  is the validator's own `ValueError` text (`"key signature 9 out of range
  [-7, 7]"`), not FastAPI's generic enum message.
- `/mary` and `/random` predate `run_game_endpoint` and return their errors
  as a **plain-text body** (no `Content-Type: application/json`, no
  `{"error": ...}` wrapper) — assert `response.body` as a raw string, not
  `response.body.error`. `/mary` also has its own message text
  (`"The note <e> is not currently supported, reconsider you root note"`),
  distinct from every other game endpoint's `"something is not
  right!<e>"`.

See `music-api/README.md`'s "Error-mapping contract" section for the
non-test-suite version of this rule.
