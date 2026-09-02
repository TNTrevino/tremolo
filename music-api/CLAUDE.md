# music-api — agent notes

Stateless FastAPI + music21 MusicXML generator. **Read `README.md` here before
structural changes** — it has the full endpoint reference and architecture.

Invariants (violating these breaks rendering or the frontend contract):

- Flats are spelled `-` on the wire (`B-`); the frontend converts to/from UI
  `b` notation in `services/api/mappers/music.mapper.ts`. Never return `Bb`.
- A music21 Note object may appear only ONCE per Stream — transpose a fresh
  note per element.
- Multi-note questions must stay in ONE measure: use
  `_hidden_time_signature()` (8/1 scales, 2/1 melodic intervals). OSMD honors
  `print-object="no"`.
- Game endpoints go through `run_game_endpoint` (400 for
  ValueError/KeyError/Music21Exception, logged 500 otherwise) and are sync
  `def` (music21 is blocking; FastAPI threadpools them). Keep both.
- Answers are generated server-side and returned with the XML — the frontend
  validates against them; never move answer logic client-side.
- New game endpoint: model in `models.py` → method in
  `services/music_service.py` → route via `run_game_endpoint` → test file per
  endpoint. `/scale-game` is the template.

Python 3.14 — matches CI (`music-api.yml`) and the deploy runner
(`deploy.yml`); build the venv with a 3.14 interpreter so local dev doesn't
drift from prod.

Workflow: `source env/bin/activate`; `python -m pytest --no-cov -q`;
`black .` (80 cols), flake8, and pytest are all CI-enforced.
