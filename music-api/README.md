# Music Generation Microservice

Stateless FastAPI service (port 8000) that generates MusicXML exercises with
[music21](https://web.mit.edu/music21/) for the Tremolo frontend. No auth, no
database, no calls to the Go service — the frontend talks to it directly via
`VITE_BACKEND_MUSIC`, and the frontend renders the returned MusicXML with
OpenSheetMusicDisplay (OSMD). For the whole-repo picture see the root
[`CLAUDE.md`](../../CLAUDE.md).

There are two kinds of endpoints:

- **Legacy exercise endpoints** (`/music/mary`, `/music/random`) — return raw
  MusicXML with `Content-Type: application/xml`.
- **Identification-game endpoints** (`/music/note-game`,
  `/music/key-signature-game`, `/music/scale-game`, `/music/chord-game`,
  `/music/interval-game`) — return JSON
  `{ "generatedXml": "<MusicXML string>", ...answer fields }`. The answer is
  generated server-side and returned alongside the XML so the frontend can
  validate the user's guess without ever trusting the client to compute it.

## Layout

```
music-api/
├── main.py                  # FastAPI app, CORS, mounts router at /music
├── models.py                # Pydantic request/response models
├── routers/api.py           # Endpoints + run_game_endpoint error mapping
├── services/
│   ├── music_service.py     # ALL music21 logic (stream building, XML export)
│   └── deps.py              # DI: lru_cache'd MusicService singleton
├── tests/                   # One test file per endpoint + shared fixtures
├── pytest.ini               # Test config, markers, coverage
├── pyproject.toml           # black (line length 80, py311)
├── .flake8                  # flake8 config
├── gunicorn_config.py       # Production server config
└── requirements.txt
```

## Running locally

```bash
cd music-api
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt

fastapi dev main.py        # dev server on http://localhost:8000
```

Interactive API docs: `http://localhost:8000/docs`.

Optional env vars (loaded from `.env` via python-dotenv in `main.py`):
`ENVIRONMENT`, `DEBUG`, `LOG_LEVEL`, and `ALLOWED_ORIGINS` (comma-separated
extra CORS origins; `localhost:5173`/`localhost:3000` are always allowed).

### Tests

```bash
pytest                                        # full suite with coverage (pytest.ini)
pytest tests/test_scale_game_endpoint.py -v   # one file
pytest tests/test_api.py -k name --no-cov     # single test, skip coverage
pytest -m unit                                # only unit tests
pytest -m integration                         # only integration tests
```

`pytest.ini` adds coverage flags (`--cov=routers --cov=models --cov=services`)
to every run and enforces `--strict-markers`. Registered markers: `unit`,
`integration`, `snapshot`, `slow`, `performance`.

### Formatting / linting

CI (`.github/workflows/music-api.yml`) fails a PR if `black --check .`
fails, and runs flake8 (the E9/F63/F7/F82 syntax-error pass is blocking). A
husky pre-commit hook auto-runs Black + flake8 on staged files.

```bash
black .      # format (line length 80, config in pyproject.toml)
flake8       # lint (config in .flake8; ignores E741, E501)
```

Note: CI does not currently run `pytest` (marked TODO in the workflow) — run
it locally before pushing.

## Endpoint reference

All routes are mounted under the `/music` prefix.

### `GET /music/health`

Verifies music21 can construct a note.

```json
{ "status": "healthy", "checks": { "music21": "operational" } }
```

Returns `503` with `{"status": "unhealthy", ...}` if music21 fails.

### `POST /music/mary` (legacy)

"Mary Had a Little Lamb" transposed to the given tonic/octave. Returns raw
MusicXML (`application/xml`), not JSON.

```json
{ "tonic": "C", "octave": 4 }
```

### `POST /music/random` (legacy)

One measure pattern repeated 4 times with the given rhythm on a single pitch.
Returns raw MusicXML. `rhythm` is a digit string; for `rhythmType: 16` the
digits mean `0`=rest 0.25, `1`=note 0.25, `2`=note 0.5 (valid: `"1111"`,
`"112"`, `"121"`, `"211"`, `"0111"`); for `rhythmType: 8`: `0`=rest 0.5,
`1`=note 0.5 (valid: `"11"`, `"01"`, `"10"`).

```json
{ "rhythm": "1111", "rhythmType": 16, "tonic": "C" }
```

### `POST /music/note-game`

One random diatonic note from the given major scale. Two modes:

**Fixed-octave mode** — note chosen from the 7 scale degrees starting at
`scale`+`octave`:

```json
{ "scale": "C", "octave": "4" }
```

**Range mode** — when both `lowNote` and `highNote` are set, the note is
chosen from all pitches of the scale within `[lowNote, highNote]` (inclusive),
ignoring `octave`. `lowNote > highNote` or an empty range is a 400.

```json
{ "scale": "G", "octave": "4", "lowNote": "B3", "highNote": "D5", "clef": "bass" }
```

Response (`noteName` uses music21 spelling, e.g. `"B-"` for B-flat):

```json
{ "generatedXml": "<score-partwise>...</score-partwise>", "noteName": "G", "noteOctave": "4" }
```

### `POST /music/key-signature-game`

An empty measure showing only a clef and a random key signature. All fields
have defaults, so `{}` is valid. `keySignatures` are fifths counts, each in
`[-7, 7]` (negative = flats).

```json
{ "clefs": ["treble", "bass"], "keySignatures": [-3, 0, 2] }
```

```json
{
  "generatedXml": "<score-partwise>...</score-partwise>",
  "tonic": "E-",
  "minorTonic": "C",
  "sharps": -3,
  "clef": "treble"
}
```

### `POST /music/scale-game`

One ascending octave of a random scale as 8 whole notes in a single measure.
`questionMode: "accidentals"` (default) prints no key signature so every
accidental appears inline; `"key_signature"` prints the scale's key signature
instead (raised harmonic/melodic-minor degrees still print inline). Scale
types: `major`, `natural_minor`, `harmonic_minor`, `melodic_minor`.

```json
{
  "tonicPool": ["C", "G", "F"],
  "scaleTypes": ["major", "harmonic_minor"],
  "questionMode": "accidentals",
  "octave": 4,
  "clefs": ["treble"]
}
```

```json
{
  "generatedXml": "<score-partwise>...</score-partwise>",
  "tonic": "G",
  "scaleType": "harmonic_minor",
  "clef": "treble"
}
```

### `POST /music/chord-game`

A single whole-note chord from a random root and quality, optionally in a
random inversion (`0`..`min(3, notes-1)`). Qualities: `major`, `minor`,
`augmented`, `diminished`, `dominant7`, `major7`, `minor7`,
`half_diminished7`, `diminished7`, `dominant9`, `major9`, `minor9` (the 9th
chords are not in the default pool).

```json
{
  "rootPool": ["C", "F", "G"],
  "qualities": ["major", "minor", "dominant7"],
  "inversions": true,
  "octave": 4,
  "clefs": ["treble"]
}
```

```json
{
  "generatedXml": "<score-partwise>...</score-partwise>",
  "root": "F",
  "quality": "dominant7",
  "inversion": 2,
  "clef": "treble"
}
```

### `POST /music/interval-game`

A random interval above a random *natural* root note, rendered either as a
stacked chord (`displayMode: "harmonic"`, default) or two sequential whole
notes in one measure (`"melodic"`). Interval names are music21 shorthand
(`m2`, `M2`, ..., `A4`, `d5`, ..., `P8`). `number` is the generic interval
size, `quality` is the name minus digits (`"M3"` → `"M"`).

```json
{ "clefs": ["treble"], "displayMode": "harmonic", "intervals": ["m3", "M3", "P5"] }
```

```json
{
  "generatedXml": "<score-partwise>...</score-partwise>",
  "interval": "M3",
  "number": 3,
  "quality": "M",
  "clef": "treble"
}
```

## Architecture

### Request flow

```
frontend (music.service.ts)
  → routers/api.py endpoint (Pydantic validation via models.py)
    → run_game_endpoint(name, build)        # game endpoints only
      → MusicService.get_*_game(...)        # builds a music21 Stream
        → stream_to_xml_bytes()             # GeneralObjectExporter(stream).parse()
  ← JSONResponse { generatedXml, ...answer fields }
```

- `main.py` creates the app and CORS middleware and mounts
  `routers/api.router` at `/music`.
- `services/deps.py` provides `get_music_service()`, an `lru_cache(maxsize=1)`
  singleton injected with `Depends`. `MusicService` is stateless, so one
  instance serves all requests.
- `MusicService` owns *all* music21 knowledge (routers never import music21
  for generation — only for the health check and exception type). Every
  generator builds a `Stream` via `_new_stream()` (piano instrument with blank
  part name, optional clef, optional key signature), then
  `stream_to_xml_bytes()` blanks the title/composer metadata and exports with
  `GeneralObjectExporter`.

### Error-mapping contract

`run_game_endpoint` in `routers/api.py` wraps every game endpoint:

- `ValueError`, `KeyError`, `music21.exceptions21.Music21Exception` →
  **400** with body `"something is not right!<error>"`. These are treated as
  "bad musical input" — e.g. an unsupported clef raises `ValueError`, an
  unknown scale type raises `KeyError`, an invalid pitch raises a music21
  exception.
- Anything else → logged via `logger.exception` and **500** with
  `"Internal server error"` (details never leak to the client).

The legacy `/mary` and `/random` endpoints predate the helper and inline the
same try/except pattern (with `/mary` using a different 400 message,
`"The note ... is not currently supported..."` — tests depend on these message
substrings). Malformed request bodies never reach this layer: Pydantic
validation returns FastAPI's standard **422**.

### Why game endpoints are sync `def`

The game endpoints are deliberately plain `def`, not `async def`. music21
stream building and MusicXML export are CPU-bound/blocking; FastAPI runs sync
endpoints in its threadpool, so a slow export doesn't block the event loop.
An `async def` endpoint doing this work would stall every other in-flight
request. (`/mary` and `/random` are still `async def` — a historical wart;
new endpoints should be sync.)

## music21 patterns and gotchas

These took real debugging to learn. Read before touching `music_service.py`.

### Flats are `-` on the wire, `b` in the UI

music21 spells B-flat as `"B-"`, and that is what this service accepts and
returns everywhere: request tonics/roots (`"E-"`), answer fields
(`noteName: "B-"`, `tonic: "E-"`), and `CIRCLE_OF_FOURTHS` keys. The
**frontend** converts to/from the UI's `"Bb"` spelling at its API boundary
(`frontend/src/services/api/mappers/music.mapper.ts`). Never send `"Bb"` to
this service and never emit `"Bb"` from it.

### One Note object per Stream

A music21 `Note` object may appear only **once** per `Stream`. Reusing the
same object (e.g. appending `root` twice, or building a melody from one shared
note) silently corrupts the stream. Always transpose a fresh note per
position: `root.transpose(interval.Interval("M3"))` returns a *new* `Note`,
which is why `get_mary_had`, `get_chord_game`, and `get_interval_game` all
build every note via `transpose` from the root.

### Hidden time signatures keep multi-note questions in ONE measure

By default music21 splits 8 whole notes into 8 measures of 4/4, which OSMD
renders as eight full-width measures — unusable for a compact game question.
The trick (`_hidden_time_signature`): append a `TimeSignature` big enough to
hold everything, with `ts.style.hideObjectOnPrint = True`. It comes out in
the XML as `<time print-object="no">`, which OSMD honors — the notes share one
measure but no time signature is drawn.

- Scale game: `8/1` (eight whole notes).
- Melodic interval game: `2/1` (two whole notes).

### Hidden whole rest for the empty key-signature measure

An empty measure exports as malformed/degenerate MusicXML. The key-signature
game appends a whole rest with `r.style.hideObjectOnPrint = True` so the
measure is well-formed but renders as just a clef + key signature.

### Clefs, default octaves, and interval root ranges

Seven clefs are supported (`MusicService.CLEFS` / the `Clef` Literal in
`models.py`): `treble`, `bass`, `alto`, `tenor`, `soprano`, `mezzo_soprano`,
`baritone` (an F-baritone clef). Two per-clef tables keep questions on the
staff instead of buried in ledger lines:

- `DEFAULT_OCTAVES` — octave used when a request omits `octave`
  (4 for treble/soprano/mezzo/alto, 3 for bass/tenor/baritone), resolved by
  `_resolve_octave`.
- `INTERVAL_ROOT_RANGES` — per-clef natural-note range for interval-game
  roots when no octave is requested (e.g. treble `C4–C5`, bass `E2–E3`).
  These are expanded **once at import time** into
  `MusicService.INTERVAL_ROOT_CANDIDATES` (a dict of pitch-name lists, built
  by walking `scale.MajorScale("C").getPitches(low, high)`) instead of
  recomputing per request.

### Answers are server-generated

Every game response carries the answer fields next to the XML (`noteName`,
`tonic`/`minorTonic`/`sharps`, `scaleType`, `root`/`quality`/`inversion`,
`interval`/`number`/`quality`). The frontend validates guesses against these,
so correctness never depends on the client parsing the XML — and a new game
must always return its answer this way.

## Adding a new game endpoint

Use `/scale-game` as the template (model → service → route → tests). The
frontend/Go halves of the recipe are in the root `CLAUDE.md` under "Adding an
identification game".

1. **`models.py`** — add `<Name>GameInput` (camelCase fields, sensible
   defaults so `{}` works, `Literal`/validators for constrained values) and a
   `<Name>GameResponse` documenting the shape (`generatedXml` + answer
   fields).
2. **`services/music_service.py`** — add `get_<name>_game(...)` returning
   `Tuple[xml_str, ...answer values]`. Build the stream with `_new_stream()`,
   pick random values from the request pools, respect the gotchas above
   (fresh notes, hidden time signature if multiple notes must share a
   measure, `_resolve_octave` for optional octaves), and finish with
   `self.stream_to_xml_bytes(s).decode("utf-8")`. Raise `ValueError` for bad
   musical input — the router maps it to 400.
3. **`routers/api.py`** — add a **sync** `@router.post("/<name>-game")`
   endpoint with `service: MusicService = Depends(get_music_service)` whose
   body is just a `build()` closure passed to
   `run_game_endpoint("/<name>-game", build)`.
4. **`tests/test_<name>_game_endpoint.py`** — see below.

## Testing conventions

- **One test file per endpoint**: `tests/test_<name>_game_endpoint.py`
  (plus `test_note_game_range.py` for note-game range mode, and cross-cutting
  `test_api.py`, `test_error_handling.py`, `test_integration.py`,
  `test_response_format_validation.py`).
- Shared fixtures live in `tests/conftest.py` — most importantly `client`
  (a fresh `TestClient(app)` per test) plus valid/invalid payload sets for
  the legacy endpoints.
- Tests are grouped in `Test*` classes per concern (happy path, validation,
  XML structure). Game tests typically assert: `{}` works via defaults, the
  response has exactly the documented keys, the XML parses with
  `xml.etree.ElementTree` and has the expected structure (note counts,
  single measure, `print-object="no"` on hidden elements), and bad input
  returns 400 with the `"something is not right!"` message.
- Markers (`@pytest.mark.unit`, `integration`, `snapshot`, `slow`,
  `performance`) are registered in `pytest.ini` with `--strict-markers` — an
  unregistered marker fails the run.
- Coverage (branch mode) over `routers`, `models`, and `services` is
  configured in `pytest.ini` and reported as terminal + HTML (`htmlcov/`) +
  XML (`coverage.xml`) on every run; use `--no-cov` for quick single-test
  loops.

## Production deployment

Served with gunicorn (see `gunicorn_config.py`; a `Dockerfile` and
`docker-compose.yml` also live here):

```bash
gunicorn main:app -c gunicorn_config.py
```
