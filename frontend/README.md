# Tremolo — frontend

The Angular 22 SPA behind [tremolonotes.com](https://tremolonotes.com): note
identification, key-signature / interval / scale / chord games, sheet-music
generation, a MusicXML converter, progress dashboards, and the teacher tier
(classes and assignments).

It talks to two backends directly — the Go "user tracking" service on `:5001`
and the Python "music generation" service on `:8000` — and they do not talk to
each other. See the repo root `README.md` for running those.

**Where to read next**

| Doc                   | What it is                                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ARCHITECTURE.md`     | How the app is put together: the identification-game engine, the API layer, the OSMD rendering layer, adding a game. Read before structural changes. |
| `DESIGN.md`           | The visual source of truth. Ink / paper / brass tokens; brass is scarce; `--accent` is a hover wash, never emphasis.                                 |
| `CLASSES_FRONTEND.md` | The teacher tier — the Go API contract and how the classes feature is wired.                                                                         |
| `CLAUDE.md`           | The short invariants list, for agents and for humans in a hurry.                                                                                     |
| `e2e/README.md`       | The Playwright suite and the screenshot baselines.                                                                                                   |
| `.migration/`         | The React → Angular migration record: plan, phase ledger, deviations, parity report. History, not instructions.                                      |

## Setup

Angular 22 accepts Node `^22.22.3 || ^24.15.0 || >=26.0.0` and nothing else,
so the version is not optional. `.nvmrc` pins 24, and on this project nvm
lives at `~/.config/nvm`:

```bash
export NVM_DIR="$HOME/.config/nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
node --version        # must print v24.x

npm install
npm run dev           # ng serve on http://localhost:4200
```

Add `-- --port 4300` for a second server; 4200 and 4300 are both in the Go
service's default `ALLOWED_ORIGINS`, so either works for signed-in flows.

There is **no `.env`** here. Config is a source file:
`src/environments/environment.ts` for dev, swapped for `environment.prod.ts`
on a production build by `angular.json`'s `fileReplacements`. Change the API
URLs there. On a deployed machine the workflow generates `environment.prod.ts`
from `/etc/tremolo/.env`, which is why the `VITE_*` names still exist there.

Activate the repo's pre-commit hook once per clone, from the repo root:

```bash
make hooks
```

It runs Prettier over staged frontend files (and Black / gofmt for the other
services).

## Commands

| Command                           | What it does                                                               |
| --------------------------------- | -------------------------------------------------------------------------- |
| `npm run dev` / `npm start`       | `ng serve`, port 4200                                                      |
| `npm run build`                   | `ng build` — output `dist/tremolo-frontend/browser/`. Type errors fail it. |
| `npm run watch`                   | `ng build --watch --configuration development`                             |
| `npm run test`                    | `ng test --watch`                                                          |
| `npm run test:run`                | `ng test`, single run — this is what CI runs                               |
| `npm run test:coverage`           | `ng test --coverage`                                                       |
| `npm run lint` / `lint:fix`       | `ng lint`, `--max-warnings 0`                                              |
| `npm run format` / `format:check` | Prettier                                                                   |
| `npm run e2e`                     | Playwright, against a server you are already running                       |
| `npm run e2e:baselines`           | The screenshot pass only                                                   |

A single spec file: `npx ng test --include src/path/to/file.spec.ts`.

The unit-test runner is vitest, but its configuration lives in `angular.json`
under `@angular/build:unit-test` — there is **no `vitest.config.ts`**, and the
builder does not support an external one.

From the repo root, the Makefile wraps all of it and is what CI runs:

```bash
make test-frontend    lint-frontend    format-check-frontend    build-frontend
make check-frontend   # all four, in that order
make check            # every service
```

## End-to-end tests

`e2e/` holds the Playwright suite: 43 golden-flow tests plus 80 screenshot
baselines in `.migration/baselines/`. It was written against the React app and
carried over unmodified, which is what made it a parity harness during the
migration and a regression suite now.

It needs both backends up and a server already running — it starts nothing
itself — and it is deliberately **not** in CI, which has no database:

```bash
npm run dev -- --port 4300
E2E_BASE_URL=http://localhost:4300 npm run e2e
```

The specs seed their own users, classes and assignments through the Go API
rather than through the UI. `e2e/README.md` has the details.

## Layout

```
src/
├── main.ts                 bootstrap
├── styles.css              Tailwind + the DESIGN.md tokens + font imports
├── environments/           environment.ts, environment.prod.ts
├── testing/                shared spec fixtures
└── app/
    ├── app.config.ts       providers: zoneless, router, HttpClient + interceptors
    ├── app.routes.ts       every route, inlined (there are no *.routes.ts files)
    ├── core/               interceptors, global error handler, nav, toasts, theme
    ├── shared/             UI kit, form controls, charts, models, mappers, utils
    ├── auth/               login, signup, Google callback, guards, AuthStore
    ├── public/             home, about
    ├── dev/                /dev/kit — the component gallery, removable
    └── features/
        ├── identification-game/   the game engine + the four games
        ├── note-game/             composes that engine, adds audio + keyboard
        ├── sheet-music/           OSMD wrapper, generator page, converter
        ├── classes/               the teacher tier
        ├── dashboard/             charts and stats
        ├── friends/
        └── account/
```

Path aliases: `@app/`, `@core/`, `@shared/`, `@features/`. Hard tabs
throughout — Prettier is configured for them and `format:check` enforces it.

`/dev/kit` renders every UI primitive, the form controls and an OSMD sample on
one page. It touches no API and is meant to be trivially deletable.
