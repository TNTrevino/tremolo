# Phase 7 — Cutover

**Depends on:** 5, 6 (and therefore all prior) · **Weight:** ~7%

## Objective

Delete React, align CI and docs with reality, leave the branch mergeable.

## Preconditions

```bash
cat frontend/.migration/STATE.md     # phases 0-6 ALL → done
ls frontend/.migration/phase-*-handoff.md    # all present
cd frontend && npm run build && npm run lint && npm run test:run
```

Both backends running for the full parity gate.

## Work

### 1. Test sweep

Every `*.test.*` in `frontend-react/` either has an Angular counterpart or a
recorded reason it doesn't. Coverage not materially below the React baseline.

### 2. Full parity gate — BEFORE any deletion

- The **entire** Phase 0 E2E suite passes **unmodified** against Angular.
- Full screenshot-diff run across all routes × viewports × themes, output to
  `.migration/parity-report/`.
- Every over-threshold diff is either fixed or **explicitly accepted in the
  report with a reason**. A human reviews the accepted list — do not
  self-approve visual regressions.

### 3. Delete React (only after the gate)

```bash
git rm -r frontend-react/
grep -ri "react" frontend/package.json     # → no matches
find frontend/src -name '*.tsx'            # → no results
```

**Keep** `frontend/e2e/` and `.migration/baselines/` — they are now the
Angular app's regression suite.

### 4. CI and tooling

- `.github/workflows/` frontend job runs the Angular build/lint/test commands
- Root `Makefile` targets (`make test-frontend`, `lint-frontend`, etc.) verified
- husky pre-commit + lint-staged verified against the new layout
- `.nvmrc` committed and respected by CI

### 5. Docs — rewrite to match reality

These all describe the React app and will be actively misleading:

- `frontend/CLAUDE.md` — **especially the invariants list**: `GameDefinition`
  is now pure `.ts` data with an `Observable` `fetchQuestion`; the queue keys
  on the serialized `toRequest` via an RxJS pipeline; no hooks. Take the final
  interface verbatim from Phase 5's handoff.
- `frontend/ARCHITECTURE.md` — game engine, API conventions, rendering layer
- `frontend/README.md` — commands (`ng serve`, not `npm run dev`)
- `frontend/DESIGN.md` — check for React-specific component references
- `frontend/CLASSES_FRONTEND.md`
- Root `CLAUDE.md` — the frontend description, the command list, and the
  **"Adding an identification game"** recipe (step 2 is entirely React-specific)

### 6. Environment & deploy

- `.env.example` updated for the `environments/` scheme
- Deploy path for the built Angular app verified

### 7. Ledger

Final `STATE.md` entry. Keep `.migration/` as the migration's historical
record — do not delete it.

## Verify

```bash
# from a fresh clone of the branch
cd frontend && npm ci && npm run build && npm run lint && npm run test:run
cd .. && make check-frontend        # or the updated equivalent
```

Manual smoke of every route against live backends.

## Exit criteria

- [ ] No React anywhere in the dependency tree
- [ ] Full E2E suite green against Angular, unmodified
- [ ] Parity report exists with zero unreviewed diffs
- [ ] CI green on the branch
- [ ] Docs describe the Angular app, not the React one
- [ ] `frontend/CLAUDE.md` invariants match the shipped code
- [ ] Branch is merge-ready

> **Merging to `main` is a human decision.** Do not merge, and do not open the
> PR as auto-merge. Report readiness and stop.

## Handoff must record

- The accepted-visual-diff list and who reviewed it
- Any test that was dropped rather than ported, and why
- Anything deliberately left for a follow-up branch
