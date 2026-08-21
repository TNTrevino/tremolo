# The parity harness

The app's regression suite. It was written against the old React app in
Phase 0 of the 2026 Angular migration and proved green there; the Angular
app passes the **same, unmodified** suite, which is what "the migration
preserved behaviour" means concretely. `E2E_BASE_URL` is the only thing
that ever changed.

A spec that has to be edited to pass is a behaviour change. Treat it as
one: record why in the commit, do not quietly edit the spec.

## Running it

Both backends must be up (Go on `:5001`, Python on `:8000`) and a Postgres
`tremolo` database reachable — the specs seed real users, classes, and
assignments through the Go API. See `.migration/phase-0-handoff.md` for the
exact backend invocations.

```bash
export NVM_DIR="$HOME/.config/nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
cd frontend

npm run dev &                                    # ng serve on :4200
npm run e2e                                      # runs against :4200
E2E_BASE_URL=http://localhost:4300 npm run e2e   # or any other port
```

| Variable       | Default                 | What it points at           |
| -------------- | ----------------------- | --------------------------- |
| `E2E_BASE_URL` | `http://localhost:4200` | the frontend under test     |
| `E2E_MAIN_API` | `http://localhost:5001` | the Go service, for seeding |

## Screenshot baselines

80 PNGs — 20 routes × 2 viewports (1280×800, 390×844) × 2 themes — in
`.migration/baselines/`, named `<slug>-<viewport>-<theme>.png`.

```bash
npm run e2e:baselines -- --update-snapshots   # capture / re-capture
npm run e2e:baselines                         # compare
```

The staff region is masked on every route that draws one: the music is
randomly generated, so pixel-diffing it is meaningless. That it rendered
at all is asserted separately in `specs/games.spec.ts`.

## The one rule

**Select only by role, accessible name, or visible text.** Never a CSS
class, a DOM path, or a test id — those are exactly what a rewrite changes.

Keep every locator in `support/app.ts` so the rule is enforceable by
reading one file. If a control cannot be reached through the accessibility
tree, the fix is to give it an accessible name **in the app**, not to reach
around the tree here. Phase 0 did this for nine icon-only controls; they
are listed in the handoff, and the Angular port must reproduce those names.

## Layout

| Path                | What it is                                                  |
| ------------------- | ----------------------------------------------------------- |
| `routes.ts`         | the 20 routes and each one's guard, shared by both projects |
| `support/api.ts`    | seeds users/classes/assignments through the Go API          |
| `support/app.ts`    | page helpers — the only place locators live                 |
| `specs/`            | the golden flows (`--project=golden`)                       |
| `baselines.spec.ts` | the screenshots (`--project=baselines`)                     |
