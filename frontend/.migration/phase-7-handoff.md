# Phase 7 handoff — cutover

Built 2026-08-21 on `feature/angular-migration`, from `7ba576d` (Phase 6
`done`). No worktree: this phase deletes a top-level directory and rewrites
the repo's docs, and doing that in a side branch only buys a merge.

**`frontend-react/` is gone.** The Angular app in `frontend/` is the frontend.
The branch is merge-ready, and merging is a human decision — see §9.

---

## 1. The gate, which came first

Nothing was deleted until the whole parity gate passed on the Angular app.

**E2E: 43 / 43**, the golden suite unmodified (`git status --porcelain e2e/`
empty before the run), on an own dev server on `:4300` whose cwd was verified
through `/proc/<pid>/cwd`, with both backends live. `navigation` 21/21, `auth`
5/5, `friends-and-theme` 4/4, `classes` 4/4, `games` 6/6, `settings` 3/3.
Re-run **after** the deletion: 43/43 again, so nothing referenced the React
tree at runtime.

**Screenshots: 68 / 80 inside threshold, 12 over, 0 open.** The 12 are exactly
the login / signup / google-callback restyle residual the record has carried
since Phase 3.1 — a `DESIGN.md` rule-4 brass CTA and a rollout-step-3
`font-display` heading, both newer than the Phase 0 baselines. Localised
numerically rather than asserted: a per-row diff profile puts **99.5% of the
delta in those two bands** (the 44px CTA fill is 87.2%, the heading 12.3%),
and the nav band differs by 72 pixels of 24,960 — ratio 0.0029 against a 0.01
threshold — which is antialiasing present on all 80 shots.

The full report, with every diff image, is
**`.migration/parity-report/README.md`**. It ends "Awaiting human review: 12
accepted diffs". **No agent has approved a visual regression and none is
claimed.** The 12 trace to a Phase-2 design decision a human signed off; they
are accepted *by the record*, and the human review is still outstanding.

`baselines.spec.ts` uses a hard assertion, so it aborts each pass at its first
failure and can only ever report 4 of the 12. The sweep ran a soft-assertion
copy of it (`sed` on the one `expect(` line, every other byte identical) under
a throwaway config; both temporary files were deleted, and `e2e/` and
`.migration/baselines/` are byte-identical to their pre-phase state.

---

## 2. Test sweep — every React test file accounted for

20 React test files, 157 cases. Angular: **63 spec files, 542 unit tests**,
plus 43 E2E cases React had no equivalent of. Coverage is not materially
below the React baseline; it is roughly **3.5x** it.

| React test file | Cases | Angular counterpart | Status |
| --------------- | ----- | ------------------- | ------ |
| `features/classes/components/AssignmentCard.test.tsx` | 11 | `assignment-card.component.spec.ts` (13) | PORTED |
| `features/classes/components/AssignmentResultsGrid.test.tsx` | 5 | `assignment-results-grid.component.spec.ts` (7) | PORTED |
| `features/classes/components/ClassInsightTiles.test.tsx` | 4 | `class-insight-tiles.component.spec.ts` (4) | PORTED |
| `features/classes/components/CreateAssignmentDialog.test.tsx` | 2 | `create-assignment-dialog.component.spec.ts` (5) | PORTED |
| `features/classes/components/JoinClassCard.test.tsx` | 5 | `join-class-card.component.spec.ts` (8) | PORTED |
| `features/classes/components/MyClassesView.test.tsx` | 5 | `classes-page.component.spec.ts` (7) | PORTED |
| `features/identification-game/settings/sanitizeConfig.test.ts` | 5 | `sanitize-config.spec.ts` (5) | PORTED |
| `features/note-game/components/KeyboardBindings.test.tsx` | 16 | `keyboard-bindings-editor.component.spec.ts` (10) + `keyboard-bindings-dialog.component.spec.ts` (9) | **PORTED — written in this phase, see below** |
| `features/note-game/hooks/useNoteQueue.test.ts` | 7 | `question-queue.service.spec.ts` (10) | PORTED |
| `features/note-game/rangeUtils.test.ts` | 12 | `range.utils.spec.ts` (12) | PORTED |
| `pages/AssignmentPlayPage.test.ts` | 3 | `game-definitions.spec.ts` (9) | PORTED |
| `services/api/classes.service.test.ts` | 13 | `classes.service.spec.ts` (13) | PORTED |
| `services/api/user.service.test.ts` | 2 | `user.service.spec.ts` (18) | PORTED |
| `shared/components/layout/GuestRoute.test.tsx` | 4 | `guest.guard.spec.ts` (2) | PORTED |
| `shared/components/layout/Navigation.test.tsx` | 8 | `navigation.component.spec.ts` (16) | PORTED |
| `shared/components/layout/ProtectedRoute.test.tsx` | 6 | `auth.guard.spec.ts` (3) | PORTED |
| `shared/components/music/RhythmGlyph.test.tsx` | 7 | `rhythm-glyph.component.spec.ts` (8) | PORTED |
| `shared/components/ui/button.test.tsx` | 24 | `button.component.spec.ts` | PORTED |
| `shared/hooks/queries/useUserQuery.test.ts` | 7 | `user.service.spec.ts` "keyboard bindings" + `note-game-page.component.spec.ts` | COVERED-ELSEWHERE |
| `stores/auth.store.test.ts` | 11 | `auth.store.spec.ts` (8) | PORTED |

**Nothing was dropped.** The lower counts are collapses, not losses, and each
has a reason:

- The route wrappers became functional guards, so `ProtectedRoute`'s and
  `GuestRoute`'s "renders children" cases have nothing to assert — a guard has
  no children. "renders complex children correctly" is a React render concern.
- `auth.store.test.ts` spent three cases on Zustand shape trivia (separate
  "starts with null user" / "null token" / "false isAuthenticated" cases) that
  are one derivation in a signal store. The Angular spec adds
  cross-app-persistence tests React had none of.
- `button.test.tsx`'s 24 cases include 11 that Angular writes as two `it.each`
  blocks over the 6 variants and 5 sizes. "forwards ref to button element" has
  no Angular analogue.
- `useUserQuery.test.ts` is the only **COVERED-ELSEWHERE** row and the only
  genuinely React-only file: `queryKey` factories, `invalidateQueries`,
  `enabled:` gating and `meta.suppressErrorToast` are TanStack Query
  mechanisms, and `rxResource` has no cache to test (D6). The *behaviours*
  survive — 404→null and the wire's `key_bindings` wrapping are in
  `user.service.spec.ts`, graceful fallback on a failed bindings fetch is in
  `note-game-page.component.spec.ts`, and toast suppression became a
  per-component assertion in `join-class-card.component.spec.ts`.

Modules deliberately not ported at all, each recorded earlier in `STATE.md`:
`isValidNote` / `isValidRhythm`, `calculateNPM`, `ACCIDENTALS` (dead code —
nothing imported them), `endGameRef` (existed only to break a hook cycle),
`ComponentErrorBoundary` / `GameBoardFallback` (replaced by the global
`ErrorHandler` plus error signals, Phase 2 §5), `FriendsUIStore`'s interface
(its fields are the store's signals), and the `passwordErrors.root` banner (an
unreachable branch in React).

### The one real hole, and it is closed

`KeyboardBindings.test.tsx` — 16 cases, the largest single React component
test — had **no** Angular counterpart, no E2E coverage, and no recorded reason.
`keyboard-bindings-editor.component.ts` and
`keyboard-bindings-dialog.component.ts` were 285 lines of shipped, wired UI
with zero specs. It read as an oversight rather than a decision, so this phase
wrote both specs (`16b8507`): **19 tests**, taking the suite from 523/61 to
**542/63**.

Two things made it worse than the count suggested, and both are now pinned.
The Escape-cancel behaviour is a deliberate framework deviation
(`phase-6-handoff.md` row 12): the editor calls `stopPropagation()` in the
capture phase so a cancelling Escape never reaches the dialog's close handler.
And the conflicting-key auto-swap is non-obvious logic. Both were
**mutation-tested**:

- Commenting out `event.stopPropagation()` in `capture()` fails exactly three
  tests, and they are the right three — "swallows the cancelling Escape before
  any bubble listener sees it" (`expected [ 'Escape' ] to deeply equal []`),
  "swallows the key it binds too" (`expected [ 'p' ] to deeply equal []`), and
  the dialog's "cancels the pending rebind on Escape without closing the
  dialog" (`expected false to be true` — the dialog had closed).
- Changing the swap line's target fails one test with the diff
  `- "C": "s" / + "C": "a"`, `- "D": "a" / + "D": "s"`.

The component was reverted after each and `git diff` confirmed clean; the
commit touches the two spec files and nothing else. No product bug was found.
One behaviour worth knowing: the Angular editor calls `stopPropagation()` for
*every* key while armed where React did so only for Escape — a strictly safer
superset, and the spec pins the current behaviour.

---

## 3. The recorded carry-over: the barrel / data split

Phase 5's verifier traced the F1 test flake to specs pulling
`opensheetmusicdisplay` in through the identification-game barrel, fixed the
flake with `isolate: true`, and left the import-graph cleanup as a standing
invitation (`phase-5-handoff.md` §9, "not taken"). Phase 6 took a third of it.
This phase finished it (`4dfa1da`).

`features/identification-game/data.ts` is the **data-only entry point**:
constants, enums, model types, `defineGame`, the four game definitions,
`GAME_DEFINITIONS`, `sanitizeConfig`. `index.ts` re-exports all of it, so the
barrel stays the single public surface and **no existing import broke**. The
rule is: *data from `/data`, components and services from the barrel*, and it
is written down in `frontend/CLAUDE.md`.

`CLEF_LABELS` and `CLEF_UNICODE` moved from `ClefGlyphComponent` to
`game.utils.ts`, so a caller wanting a clef *string* — the note game's
staff-range picker does — does not load an Angular component to get one. Same
values, still one declaration.

**Measured, not assumed.** A script walked the real import graph (resolving
the four path aliases) before and after:

| Module | Before | After |
| ------ | ------ | ----- |
| `keyboard-bindings-editor.component.ts` | OSMD REACHABLE | **no** |
| `staff-range-picker.component.ts` | OSMD REACHABLE | **no** |
| `settings-bar.component.ts` | OSMD REACHABLE | **no** |
| `mobile-settings-drawer.component.ts` | OSMD REACHABLE | **no** |
| `data.ts` | — | **no** |

The two named in the review were `keyboard-bindings-editor` and
`staff-range-picker`; `settings-bar` and `mobile-settings-drawer` are the same
violation and were found here. Also repointed: `note-game-results`'s spec, the
data half of `note-game-page` and `note-game.service`, and the three modules
that had each invented their own ad-hoc deep path (`note-game.models.ts`,
`range.utils.ts`, `classes/models/game-definitions.ts`) — one entry point now,
not three.

**No spec gained OSMD.** The five that still reach it are the two sheet-music
specs (which are about OSMD), `note-game-page` and `assignment-play-page`
(which render a real staff), and `note-game-results` — whose only barrel
import is `GameOverCardComponent`, a *component*, which the rule says comes
from the barrel. That last one is avoidable only by breaking the stated rule,
so it was left; with `isolate: true` in place it is hygiene, not correctness.

Pixel-neutral by construction — no template, no style, no rendered output
changed. Gates green after: 523/61 at the time, build and lint clean.

---

## 4. The deletion

`git rm -r frontend-react/` — 254 files, 35,563 lines (`0dbdd6e`). The three
confirmations the packet asked for:

```
grep -i react frontend/package.json   → no matches (exit 1)
find frontend/src -name '*.tsx'       → no results
ls frontend-react                     → No such file or directory
```

**Kept, deliberately:** `frontend/e2e/` and `.migration/baselines/` — captured
from React, and the Angular app's regression suite now — and `.migration/`
itself, which is the migration's historical record.

**One judgment call.** About 150 files under `frontend/src/` carry a
`Port of frontend-react/src/...` provenance comment. They were **not**
rewritten. They are historical statements in the past tense, they name the
file each port came from, and rewriting 150 of them would destroy real
provenance to satisfy a grep. Instead `frontend/CLAUDE.md` now says where that
tree went and how to reach it (git history, at the commit before
`chore: delete the React app`). Live references — CI, the Makefile, the
pre-commit hook, `.gitignore`, the deploy workflow, `classes.models.ts`'s
doc pointer — were all fixed.

---

## 5. CI, tooling and deploy

`131cc64`. The `react-checks` job, the six `-react` Makefile targets and the
pre-commit hook's `frontend-react/` branch all pointed at a directory that no
longer exists; all gone, along with `frontend-react/**` in both path filters.
The aggregate make targets renumber `1/4..4/4` → `1/3..3/3`. `make help`,
`make check-frontend` and `make check` all verified from the repo root, and
all three touched workflows parse.

**`deploy.yml` is the substantive change**, and it needed a decision.

It now builds `frontend/` on the Node in `frontend/.nvmrc` and rsyncs
**`frontend/dist/tremolo-frontend/browser/`** — verified from a real build, not
from the plan. The Angular application builder emits per-project and splits
the browser bundle from the server one, so the old `dist/` path would have
shipped nothing.

The production config was the hard part. Vite read `import.meta.env` at build
time; Angular substitutes `environment.prod.ts`, which is a *source file*, so
the values must exist before the build. **Committing them does not work**: one
workflow serves prod (`geekom` → `/var/www/tremolo/`) and QA (`pi` →
`/var/www/tremolo-test/`), which have different API hosts, so no single
committed value is right for both — and the OAuth client id has no business in
the repo. So the workflow **generates** `environment.prod.ts` from
`/etc/tremolo/.env`, the same file the React build sourced its `VITE_*` vars
from, and **fails the deploy** if `VITE_BACKEND_MAIN`, `VITE_BACKEND_MUSIC` or
`VITE_GOOGLE_CLIENT_ID` is unset rather than falling through to a frontend
pointing at the wrong API. The heredoc was dry-run outside CI: it renders
valid TypeScript with hard tabs, and the guard exits non-zero on a missing var.

The committed `environment.prod.ts` stays empty and now says why: an empty
`mainApi` makes a local production bundle visibly non-functional instead of
quietly talking to the live service, and `core/interceptors/api-url.ts`
already guards on `mainApi.length > 0`.

`.env.example` keeps the three `VITE_*` names — an existing
`/etc/tremolo/.env` must keep working — with a comment saying local dev does
not read them and pointing at `src/environments/`.

**Note for whoever merges:** the first deploy after this merge is the first
time the Angular app ships. `/etc/tremolo/.env` on both machines must already
contain those three variables, or the deploy fails loudly at the new guard.
That is the intended behaviour, but it is worth checking before pushing to
`prod`.

---

## 6. Docs

`frontend/CLAUDE.md`, `frontend/README.md`, `frontend/ARCHITECTURE.md` and
`frontend/CLASSES_FRONTEND.md` **did not exist**: Phase 0 moved them under
`frontend-react/` and the deletion took them. Only `DESIGN.md` was left behind
in `frontend/` (Phase 2 deviation 1). All four are written fresh against the
shipped code, not against `PLAN.md` — R5, repo wins, and several plan details
had changed en route.

- **`frontend/CLAUDE.md`** — the invariants. The `GameDefinition` interface is
  verbatim from `models/game-definition.models.ts` and was **diffed line by
  line against the source** (18 signature lines, all identical) rather than
  retyped from the handoff. Covers the `Observable` `fetchQuestion` and why
  the music service is an argument (NG0203 inside the queue's `switchMap`),
  the queue keying on `JSON.stringify(toRequest(settings))` and its three RxJS
  mechanisms, the barrel/data rule from §3, the §5.6 subscription hygiene
  rules, notation converting only in the mapper — and a section titled "Angular
  rules that were learned the hard way" for the four traps that were shipped
  defects: `status()` rather than `isLoading()`, guarding `resource.value()`
  behind an `error()` arm, the subscription shapes, and Tailwind's
  `important: "html"` — which had to be documented outside
  `tailwind.config.js`, since that file cannot hold a comment where a reader
  would look for it.
- **`frontend/ARCHITECTURE.md`** — the structural guide: stack and entry
  points, folder layout and aliases, the game engine, adding a game, the API
  layer and interceptors, data fetching, signal stores, the rendering layer
  and the `SheetMusicComponent` API, testing, and the styling gotchas.
- **`frontend/README.md`** — Angular commands with the real script names,
  Node/nvm setup, the `make` hooks, the E2E instructions, and the layout.
- **`frontend/CLASSES_FRONTEND.md`** — reframed from build spec to reference.
  Part 1 was re-verified endpoint by endpoint against the Go controllers and
  came back with **13 corrections**; see §7.
- **`frontend/DESIGN.md`** — every design rule kept. Two stale paths fixed
  (`index.css` → `styles.css`, fonts imported in `styles.css` not `main.tsx`)
  and the rollout marked shipped, with its one partial named honestly.
- **Root `CLAUDE.md`** — frontend description, the whole command list, the
  core-loop walkthrough, the frontend-structure section, and the "Adding an
  identification game" recipe, whose step 2 was entirely React-specific.
- **Root `README.md`** — the `VITE_*` exports removed from the local-dev list
  (the frontend reads none of them now), nvm setup added, `ALLOWED_ORIGINS`
  corrected to the ports actually used, and the tech list updated.

---

## 7. Deviations

| # | What was expected | What was done | Why |
| - | ----------------- | ------------- | --- |
| 1 | Packet: "rewrite `frontend/CLAUDE.md`, `ARCHITECTURE.md`, `README.md`, `CLASSES_FRONTEND.md`" | All four were **written from scratch**; only `DESIGN.md` existed | R5. Phase 0 moved them to `frontend-react/` and the deletion took them. Recovered from git as source material for scope, then rewritten against the code. |
| 2 | Packet: `grep -rn "frontend-react"` → only `.migration/` | ~150 `Port of frontend-react/src/...` provenance comments under `frontend/src/` were left in place | They are past-tense history naming each file's origin, and rewriting them would destroy provenance to satisfy a grep. `frontend/CLAUDE.md` now says where the tree went. All *live* references were fixed. |
| 3 | Packet §6: "`.env.example` updated for the `environments/` scheme" | The three `VITE_*` names **stay**, with a comment | They are still read — by `deploy.yml`, from `/etc/tremolo/.env`, to generate `environment.prod.ts`. Deleting them would break the deploy on both machines. |
| 4 | Phase 0 handoff: "Phase 7 fills in `environment.prod.ts`" | Left empty; the deploy workflow generates it | One workflow, two targets with different API hosts, and a client id that should not be committed. Filling it in would have made the QA deploy point at production. |
| 5 | Carry-over: repoint "the two violating note-game imports" | Four components repointed, plus a spec and three ad-hoc deep paths | `settings-bar` and `mobile-settings-drawer` are the same violation and were found by re-grepping. Consolidating the three deep paths is what makes the rule one rule. |
| 6 | Test sweep: "a recorded reason it does not" | The one uncovered file got **tests**, not a reason | `KeyboardBindings.test.tsx` had no recorded reason anywhere in `.migration/` and 285 lines of live UI behind it — including an unpinned deliberate deviation. Writing the reason down would have been recording an oversight as a decision. |
| 7 | `baselines.spec.ts` reports the screenshot sweep | A soft-assertion copy did; `baselines.spec.ts` is untouched | Its assertion is hard, so it aborts each pass at `/login` and can report at most 4 of the 12. Same approach Phase 6 used. Both temp files deleted; `e2e/` byte-identical. |
| 8 | — | `@testing-library/angular` and `@testing-library/dom` are declared in `package.json` and imported by **zero** files | Found while writing the docs. Not removed here — a dependency change during a cutover is the wrong risk, and it may have been intended. Backlog item. |

---

## 8. Verification actually run

All on Node v24.19.0, from a clean tree, with both backends live.

**Fresh-clone simulation**, in `frontend/`: `npm ci`, `npm run build`,
`npm run lint`, `npm run test:run`, `npm run format:check` — see §8.1 for the
recorded exit statuses. `make check-frontend` and `make check` from the repo
root.

**E2E 43/43 twice** — once before the deletion as the gate, once after it to
prove nothing referenced the React tree at runtime. Specs unmodified both
times, own cwd-verified server on `:4300`, lock taken and released.

**Screenshots 68/80** with the 12 accepted, baselines byte-identical after.

**Determinism**: three serial `npm run test:run` runs.

**Remnants**: the packet's three greps, all clean.

---

## 9. What is left for the human

1. **Review the 12 accepted visual diffs** in `.migration/parity-report/`.
   That is the one thing this phase explicitly did not do for itself.
2. **Merge.** Not done here, and no PR was opened.
3. **Check `/etc/tremolo/.env` on `geekom` and `pi`** before the first deploy
   — see §5.
4. **The post-merge backlog** is in `STATE.md`'s closing section.
