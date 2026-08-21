# Phase 0 — Scaffold & parity harness

**Depends on:** nothing · **Weight:** ~5% · **Parallel:** no

## Objective

A booting, lintable, testable Angular 22 shell with Tailwind — nothing renders
yet — plus the parity harness (E2E specs + screenshot baselines) captured from
the **React** app while it is still the only app. Establishes the ground
everything else stands on.

## Preconditions

Run these. Any failure → STOP and record in `STATE.md`.

```bash
git branch --show-current            # → feature/angular-migration
git status --short                   # → clean
node --version                       # MUST match ^22.22.3 || ^24.15.0 || >=26.0.0
npm view @angular/cli dist-tags.latest   # → starts with 22.
```

> **Known environment issue:** this machine's system Node is **v25.9.0**, which
> satisfies **none** of Angular 22's supported ranges. Before starting:
> `nvm install 24 && nvm use 24 && nvm alias default 24`. Then re-run
> `node --version` and confirm v24.x.

Both backends must be runnable for the baseline capture (Go :5001, Python
:8000) — see root `README.md` for env vars.

## Inputs

Read before writing anything:

- `frontend/package.json` — the full dependency list to triage (PLAN.md §7)
- `frontend/tailwind.config.js`, `frontend/postcss.config.js` — carry over
- `frontend/src/index.css` — becomes `src/styles.css`
- `frontend/tsconfig.json` — strict flags to preserve
- `frontend/.prettierrc.json` — hard tabs, must survive
- `frontend/.env.example` — the `VITE_BACKEND_*` vars → `environments/`
- `frontend/vite.config.ts` — path aliases to reproduce
- Root `Makefile`, `.github/workflows/` — frontend job commands
- `frontend/src/App.tsx` — the 20 routes the E2E suite must cover

## Work

### 1. Move React aside

`git mv frontend/src frontend-react/src` (and its configs) so the React app
stays **runnable** at `frontend-react/` — it is the executable spec for the
parity harness and is not deleted until Phase 7. Keep `.migration/` where it
is, under `frontend/`.

### 2. Scaffold Angular

- Angular **22.1.3**, standalone, routing, CSS. No zone.js (D4) — verify
  `provideZonelessChangeDetection()` is in `app.config.ts`.
- **TypeScript 6.0.3 — pinned.** Do NOT install `typescript@latest` (7.0.2);
  Angular 22 peers `>=6.0 <6.1` and 7.x breaks the build (D1).
- Commit a `.nvmrc` pinning the Node major you used.
- Carry over strict flags from the old tsconfig: `strict`,
  `noUncheckedIndexedAccess`, `noImplicitReturns`, `noUnusedLocals`,
  `noUnusedParameters`, `noFallthroughCasesInSwitch`.
- Path aliases `@app/ @core/ @shared/ @features/` (D14).

### 3. Styling

- Copy `tailwind.config.js` unchanged — `@angular/build@22` peers
  `tailwindcss ^2 || ^3 || ^4` directly.
- Port `src/index.css` → `src/styles.css`, keeping both `@fontsource-variable`
  imports (Inter, Bricolage Grotesque).

### 4. Config & tooling

- `src/environments/{environment,environment.prod}.ts` exposing `mainApi` and
  `musicApi` (were `VITE_BACKEND_MAIN` / `VITE_BACKEND_MUSIC`).
- ESLint flat config via `@angular-eslint`. Prettier config carried over
  verbatim (hard tabs).
- Vitest + `@testing-library/angular@19` + jsdom (D10). One smoke test.
- Directory skeleton per PLAN.md §4 (empty dirs with `.gitkeep`).
- Update root `Makefile` frontend targets and husky/lint-staged for `ng`.

### 5. Parity harness — the important part

- Playwright (D15) in `frontend/e2e/`, `baseURL` configurable so one suite runs
  against either app.
- Write golden-flow specs **against the running React app** (`frontend-react/`,
  Vite dev server) and prove them green there:
  login → dashboard; play each of the five games (four identification + note
  game) through to game-over with a score saved; settings persist across
  reload; teacher creates a class; student joins a class; assignment play;
  friends add/list; theme toggle.
- **Selectors: user-visible only** — roles, accessible names, visible text.
  Never CSS classes, component internals, or React-specific test ids. The
  suite must be able to pass unmodified against Angular later.
- Capture screenshot baselines into `frontend/.migration/baselines/`: all 20
  routes × 2 viewports (1280×800, 390×844) × 2 themes.
- Document the exact capture command in the handoff so baselines are
  reproducible.

## Verify

```bash
cd frontend
node --version          # supported range
npm run build           # exit 0
npm run lint            # exit 0
npm run test:run        # exit 0
grep -r "zone.js" package.json src/main.ts   # → no matches
npx tsc --version       # → 6.0.x, NOT 7.x
```

- A Tailwind class (e.g. `text-red-500`) visibly applies on the shell page.
- Playwright suite exits 0 against the React app.
- `.migration/baselines/` populated: 20 routes × 2 viewports × 2 themes.

## Exit criteria

- [ ] Fresh clone + `npm ci` + build/lint/test all pass
- [ ] `ng serve` boots a blank shell with both fonts loading
- [ ] `npx tsc --version` reports 6.0.x
- [ ] No `zone.js` in the dependency tree
- [ ] E2E suite green against React; baselines committed
- [ ] `.migration/` ledger exists, Phase 0 row reads `built`

## Handoff must record

- Exact versions installed (Angular, TypeScript, Node, Playwright)
- Any scaffold defaults overridden and why
- Where each old config landed
- The exact baseline-capture command
- The E2E spec file list and which routes each covers
