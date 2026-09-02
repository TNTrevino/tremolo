# Phase 3, sub-feature 5 handoff — classes

Status: **built**. `npm run build`, `npm run lint`, `npm run test:run` and
`npm run format:check` all exit 0 (**232 unit tests in 32 files**, up from
146 in 21). Driven against the live Go service on `:5001` and diffed
against `.migration/baselines/`.

Commit range: `7131492..cf75b5e` (8 commits). Base is pre-Phase-4-merge;
the orchestrator merges.

**Read §2 first if you are auditing this slice** — it explains that this
packet was resumed after its first agent died mid-run with everything
uncommitted, and what had to be repaired before any of it was trustworthy.

**Read §7 if you are building any later slice.** It is two defects that are
invisible to `npm run test:run` and to the E2E suite, that this slice found
by pixel-diffing, and that affect every page that stacks components.

---

## 1. What exists now

All under `frontend/src/app/`.

| Area | Files |
| ---- | ----- |
| Shared helpers | `shared/utils/date.utils.ts` (+ spec), `shared/models/game.types.ts` |
| Domain + wire shapes | `features/classes/models/classes.models.ts`, `classes.mappers.ts` |
| Game registry (data half) | `features/classes/models/game-definitions.ts` (+ spec), `assignment-launch.ts` |
| Service | `features/classes/services/classes.service.ts` (+ spec) |
| Teacher pages | `components/classes-page/`, `components/class-detail-page/` |
| Student pages | `components/assignments-page/`, `components/assignment-play-page/` |
| Class pieces | `components/class-card/`, `class-header/`, `roster-list/`, `create-class-dialog/`, `class-insight-tiles/`, `join-class-card/` |
| Assignment pieces | `components/assignment-card/`, `class-assignments-list/`, `create-assignment-dialog/`, `assignment-results-grid/`, `attempt-drilldown/`, `student-assignments-list/` |
| Game handoff stub | `components/assignment-game-host/` |

Routes were already declared in Phase 1 and were **not** touched: `/classes`
and `/classes/:id` behind `teacherGuard`, `/assignments` and
`/assignments/:id/play` behind `authGuard`, all four with
`runGuardsAndResolvers: "always"`. This slice only filled in the four
placeholder components.

New specs: `classes.service.spec.ts` (13), `assignment-card` (13),
`game-definitions.spec.ts` (9), `join-class-card` (8), `date.utils` (7),
`classes-page` (7), `class-detail-page` (7), `assignment-results-grid` (7),
`assignment-play-page` (6), `create-assignment-dialog` (5),
`class-insight-tiles` (4). **86 new tests in 11 files.**

---

## 2. Audit note — this packet was resumed, not built in one pass

The first agent on this packet died on an API limit with **34 dirty files
and zero commits**. Its last recorded status was "All 223 pass (was 146).
Let me add a spec for the class detail page, the largest untested piece."

**The disk did not match that claim.** On resume the suite was **228 passed,
2 failed of 230** — the class-detail spec had in fact been written, and it
was failing. So the predecessor's last status line described the state
*before* the work that killed it, and the "223 pass" figure never applied to
the tree that was actually on disk.

What was salvaged and what was repaired:

- **All 34 files were kept.** Nothing was rewritten wholesale. The port is
  the predecessor's; the audit below is what was added on top.
- **The two failures were real defects in the app, not in the spec** — see
  §7.1. The class-detail spec was correct and the component was wrong. That
  is the spec doing its job, and it is why it was fixed rather than relaxed.
- Three files failed `format:check`; formatted, no content change.
- Everything was then committed in 6 logical units **before** any further
  work, so a second death could not lose it again. The two later commits are
  the two fixes in §7.

Two further defects were found after the tree was safe, by auditing the port
against the React sources rather than by running it: §7.2 (a dropped guard)
and §7.3 (the stacking bug that eight screenshots were failing on).

---

## 3. The pattern held

Sub-feature 1's §2 was copied without modification and needed no
amendment. Concretely:

- Every page is `templateUrl` + `OnPush` + relative imports, spec next to
  its subject, selector `app-<page-name>`.
- **This is the slice that exercises `rxResource` hardest** — nine of them,
  including the parameterised form (`params: () => this.classId()`), which
  sub-feature 1 explicitly could not demonstrate. PLAN.md §5.2 is accurate
  as written; nothing about it needed changing.
- Every mutation is a one-shot `.subscribe()` in the handler (§5.6). No
  stored `Subscription`, no `takeUntil`, no `ngOnDestroy` anywhere in the
  slice.
- D6 held with no pressure to break it. `shareReplay` still appears only in
  `refresh.interceptor.ts`. Every `cache` / `invalidateQueries` / `TanStack`
  string in `src/` is a comment explaining what was *not* ported.

**On D6 specifically, one thing is worth stating plainly for later slices.**
React's `/assignments` page did not refresh its assignment list when a
student joined a class — TanStack had the list cached and `useJoinClass`
never invalidated it, so assignments only appeared on the next load.
`e2e/specs/classes.spec.ts` has a comment saying it deliberately reloads
rather than assert either behaviour. Angular refetches, because resources do
not cache. **That is D6 working and it is not a parity break** — the E2E
spec was written to tolerate exactly this, and it was not edited.

---

## 4. Endpoint and DTO notes

- **There is no GET-by-id for a class or for an assignment.** Both detail
  pages fetch the caller's *list* and find the row in it. React did the same.
  For `/assignments/:id/play` this doubles as the authorisation check: an
  assignment for a class the student is not in is simply not in the list.
  If a by-id endpoint ever lands, these two pages are what should stop
  over-fetching.
- **The assignment `config` blob is not uniform.** The note game's config is
  snake_case (`game_mode`, `time_limit`, `clef`) because it is posted
  straight at the Python music service; the four identification games' is
  camelCase. The blob is stored verbatim and read back by the game that
  wrote it, so this asymmetry is load-bearing. A spec pins it.
- **`student_count` lives on the class, not on the roster.** Removing a
  student therefore has to refetch two things, which is why
  `RosterListComponent` both reloads its own resource and emits
  `rosterChanged` for the page to reload the class list. Those are React's
  two `invalidateQueries` calls, without the query client.
- `game-definitions.ts` hand-copies the five games' default configs out of
  React's `GameDefinition` objects, because those objects are Phase 5/6
  work. The copy was diffed against source and is currently exact; a spec
  pins each value so the drift is visible. **Phase 5/6 must replace
  `defaultAssignmentConfig()` with a read of each definition's own
  `defaults`.**

---

## 5. Assignment play is plumbing only, and that is a clean seam

`AssignmentPlayPageComponent` owns everything up to the handoff: resolve
`:id`, load the student's assignments, find the row, loading state,
not-found state, back link, and build the frozen `{ id, config }` launch.
It then renders `<app-assignment-game-host [gameType] [launch]>` and
branches on nothing.

`AssignmentGameHostComponent` is the stub: it renders "<Game> practice" and
"This assignment is ready to play. The <Game> game is not available in this
build yet." **Phase 5/6 replace that one component.** The page must not
start branching on game type — the whole point of the seam is that the page
is already correct.

React's `AssignmentPlayPage.tsx` had ten behaviours. Nine are plumbing and
all nine are ported and tested (React had **no** component test for this
page at all). The tenth is §7.2. Everything else React did — configuring
the game from the frozen config, scoring, tagging the score entry with the
assignment id — lives *inside* `NoteGamePage` / `IdentificationGamePage`,
never in the play page, so none of it is this slice's to drop.

One naming trap for whoever picks this up:
`frontend-react/src/pages/AssignmentPlayPage.test.ts` **does not test the
page.** Despite the filename it is a three-test suite over
`GENERIC_GAME_DEFINITIONS`. It is ported as
`models/game-definitions.spec.ts`, not as the page spec. Two of its three
assertions check the identity of the four `GameDefinition` objects and have
no port until Phase 5 builds them; the third survives.

---

## 6. Verification actually run

```
npm run build        exit 0
npm run lint         exit 0   (--max-warnings 0)
npm run test:run     exit 0   232 tests, 32 files  (was 146 in 21)
npm run format:check exit 0
```

### Parity suite (`E2E_BASE_URL=http://localhost:5173`, Go on `:5001`)

`e2e/` was **not** edited. `:4200` and `:4300` were held by other agents;
`:5173` is the config's own default and is CORS-approved.

**`e2e/specs/classes.spec.ts` — 3 / 4.**

| # | Test | Result | Owner |
| - | ---- | ------ | ----- |
| 1 | a teacher creates a class and gets a join code | **pass** | — |
| 2 | keeps a student out of the teacher's class list | **pass** | — |
| 3 | a student joins a class by code | **pass** | — |
| 4 | a student plays an assignment and records an attempt | **fail** | **Phase 5** (identification-game engine) |

Test 4's failure is the deferred game and nothing else. It gets all the way
through: joins the class, reloads, sees the assignment title, sees "No
attempts yet", clicks **Practice**, and **passes the
`toHaveURL(/\/assignments\/\d+\/play$/)` assertion**. It then times out
looking for the answer-pad button `C`, because the page renders the host
stub. The captured page snapshot shows the back link and a heading reading
**"Key Signature practice"** — so the route, the resource, the lookup, the
game-type resolution and the handoff are all working, and the only missing
piece is the game itself. Re-run after every change in this slice; stable.

**No regression elsewhere.** `navigation.spec.ts` **21/21**, `auth.spec.ts`
**4/5**, `friends-and-theme.spec.ts` **3/4** — 28 passed, 2 failed of 30,
which is sub-feature 1's numbers reproduced exactly. Both failures are the
known pre-existing ones: the dashboard full-name assertion (**sub-feature
6**) and the friends panel (**sub-feature 4**). `games.spec.ts` and
`settings.spec.ts` were not run — they need Phases 4–6.

### Screenshot parity — **12 / 16 within threshold**

Four routes × 2 viewports × 2 themes, diffed against
`.migration/baselines/` at the suite's own `maxDiffPixelRatio: 0.01`, using
an ad-hoc config outside `e2e/` (the committed `baselines.spec.ts`
photographs all 20 routes in one test and most are still placeholders).

| Route | Shots | Result |
| ----- | ----- | ------ |
| `classes` | 4 | **4 / 4 pass** |
| `class-detail` | 4 | **4 / 4 pass** |
| `assignments` | 4 | **4 / 4 pass** |
| `assignment-play` | 4 | **0 / 4** — ratios 0.35–0.41, and the page is 32 px shorter than the baseline at both viewports |

`assignment-play` is the Phase 5 game. The baseline photographs React
playing a key-signature game (staff, answer pad); Angular photographs the
host stub. The size mismatch is that difference, not a layout defect.
**Phase 5 owns these four shots.**

The other 12 were **not** passing when this slice was picked up — they were
4/16, and the eight `class-detail` / `assignments` shots were failing at
13,359–18,796 px (ratios 0.02 desktop, 0.04–0.06 mobile). §7.3 is why.

Note that `classes-*` passed even before that fix, and that is diagnostic
rather than lucky: `/classes` stacks plain `<div>`s, while `/classes/:id`
and `/assignments` stack component hosts. The one page that did not exhibit
the bug is the one page whose children were not components.

### Live, against the Go service with a real teacher account

Driven through the UI on `:5173`, seeded through the Go API:

- **Create class.** `/classes` → **New class** → name → **Create class**;
  the class appears on the list with a six-character join code and a **Copy
  join code** button (`classes.spec.ts` test 1).
- **Roster.** `/classes/:id` renders the class header with its join code,
  **Roster** with "Baseline Student / Joined Aug 20, 2026" and the count
  **1**, rendered as "1 student" singular.
- **Assignment list.** The same page renders **Assignments** with "Baseline
  Assignment / Key Signature" and the brass **New assignment** CTA.

All three were photographed at both viewports in both themes and are
pixel-clean against the React baselines, which is a stronger statement than
"it rendered".

---

## 7. Three defects found, and why none of them showed up in the unit suite

### 7.1 `isLoading()` is not TanStack's `isLoading`, and it tore pages down

**This is the one the predecessor's own spec caught and died before fixing.**

Angular's `resource.isLoading()` is true for status `loading` **and**
`reloading`. TanStack's `isLoading` is `isPending && isFetching` — **first
load only**; a background refetch keeps the data on screen. Every page in
this feature had been ported as `@if (x.isLoading())`, which is what React's
source literally says, and it is wrong.

The consequence is not a flicker. On `/classes/:id`, removing a student
calls `roster.reload()` and then `classes.reload()`. The second one flipped
`isLoading()` true, the `@if` tore the whole page body down, and that
**destroyed `<app-roster-list>` mid-flight — cancelling the very roster
refetch that had just been started.** The spec saw one request where two
were expected, which is exactly the observable symptom.

Fixed by gating on `status() === "loading"` in the five templates whose
resource something calls `.reload()` on: `class-detail-page`, `roster-list`,
`classes-page`, `class-assignments-list`, `join-class-card`. PLAN.md §5.2
already said `loading` vs `reloading` is what "lets first-load show a
skeleton while a refetch keeps stale data on screen" — this is that
sentence being load-bearing.

**Rule for later slices: `isLoading()` is only safe on a resource nothing
ever reloads. If it can reload, you want `status() === "loading"`.**

### 7.2 The unknown-game-type guard was silently dropped

React looked the type up in `GENERIC_GAME_DEFINITIONS` and fell through to
its not-found panel when the lookup missed. The port had no registry to miss
in, so **any** `game_type` reached the game host, where
`GAME_TYPE_LABELS[gameType]` is `undefined`, Angular interpolates that as
the empty string, and the student gets a heading reading " practice" for a
game that does not exist.

This is reachable even though the `GameType` union says otherwise:
`game_type` is filled by the Go service, so the union is a claim about the
wire rather than a guarantee from it. Fixed with a new
`isKnownGameType(value: string): value is GameType` in
`game-definitions.ts`, called from `playable()`.

`isGenericGameType()` cannot do this job and should not be reached for — it
narrows a value *already known* to be a `GameType`.

Mutation-checked: making the predicate always return true fails exactly the
two new tests (`assignment-play-page` "shows not-found for a game type this
build does not know" and `game-definitions` "recognises every known game
type and nothing else") and nothing else. Reverted, `git diff` empty.

### 7.3 An Angular component host is `display: inline`, and eats `space-y-*`

**This is the biggest one and it generalises past this slice.**

React's `<ClassHeader />` renders a `<div>` **straight into the page stack —
there is no wrapper element.** Angular interposes an `<app-class-header>`
that React never had, and an unstyled custom element is `display: inline`.
Vertical margins do not apply to a non-replaced inline box. So
`space-y-6`'s `margin-top: 1.5rem` on `> * + *` was being set on the
component hosts and **silently discarded**, and every card on
`/classes/:id` and `/assignments` butted against the next one.

Fixed with `:host { display: block }` on the eleven stacked components, and
`:host { display: contents }` on the two dialogs (they render a fixed
overlay and should contribute no box at all — what the kit's own
`app-dialog` already does).

This is the **same family** as sub-feature 1's handoff §7.3, one layer out:

| | host is | margins |
| - | ------- | ------- |
| §7.3 (kit components) | `display: contents` | no box, so ignored |
| here (feature components) | `display: inline` (default) | box exists, vertical margins do not apply |

So the rule "a container holding components uses `flex flex-col gap-*`, not
`space-y-*`" is right, but it is only half the story, and it is not the half
that generalises. **The durable rule is: an Angular component used as a
block in a layout must say so — give its host a `display`.** An unstyled
host is `inline`, which is almost never what the React original was.

That also settles the 3.1 verifier's open V1 (the mobile nav bar's 8 px
shift, same root cause on `space-x-2`). **Sub-feature 4 owns the nav.**

None of these three showed up in `npm run test:run`, and none showed up in
the E2E suite. §7.1 needed a spec that asserted on *requests*; §7.2 needed
reading the React source next to the port; §7.3 needed pixels. That is three
different instruments for three defects in one feature.

---

## 8. Deviations

| # | What the plan/packet said | What was done | Why |
| - | ------------------------- | ------------- | --- |
| 1 | Packet: port `AssignmentPlayPage.test` | Ported as `models/game-definitions.spec.ts`, and the page got a **new** spec | R5. That file does not test the page despite its name — it tests `GENERIC_GAME_DEFINITIONS`. React has no component test for the page; 5 were written. |
| 2 | Packet: port React's page structure | `@if (x.isLoading())` became `@if (x.status() === "loading")` on five templates | React's `isLoading` is first-load-only; Angular's is not. Ported literally, it destroyed child components mid-refetch and cancelled their requests. §7.1. |
| 3 | Packet is silent on component host display | `:host { display: block }` on 11 components, `display: contents` on 2 dialogs | React had no wrapper element at all. Angular's default `inline` host silently ate every `space-y-*` gap; 8 screenshots were failing on it. §7.3. |
| 4 | Packet: assignment-play is plumbing only | Added a runtime `isKnownGameType()` guard React got from its registry lookup | The guard is pure plumbing and needs no game code, so leaving it out was a dropped behaviour rather than a deferral. §7.2. |
| 5 | React's `RosterList` gave each row its own `RosterRow` component | One `confirming` signal on the list, one dialog | That component existed only to hold a `useState` for its own confirm dialog. A signal does not need a component to live in. Same behaviour, one dialog in the DOM instead of one per row. |
| 6 | React's play page used `useMemo` for a stable launch object | Plain `computed()` | `useMemo` was there because the game pages' effects keyed off the object's identity. A `computed()` is stable by construction; the concern has no port. |
| 7 | Packet: "delivered routes screenshot-diff within threshold" | 12/16 pass; the 4 `assignment-play` shots do not | The baseline photographs React **playing a key-signature game**; Angular photographs the deferred-game stub. Phase 5 owns it, and the page is 32 px shorter for exactly that reason. |
| 8 | Packet: E2E specs green | `classes.spec.ts` 3/4 | Same cause. Test 4 passes its URL assertion and reaches the host stub; it fails looking for a game answer pad. **Phase 5.** |

---

## 9. Ledger line

```
| 3 | CRUD features | built (3.1, 3.5) | 2026-08-20 | `2dd1e3d..` (3.1), `7131492..cf75b5e` (3.5) | ... **Sub-feature 5 (classes)**: classes list, class detail + roster, assignments, assignment-play plumbing, 20 components, 9 rxResources. build/lint/test:run/format:check all exit 0 (232 tests, 32 files, +86). `classes.spec.ts` 3/4 and screenshots 12/16 -- both residuals are the Phase 5 game behind `/assignments/:id/play`. 8 deviations. Resumed after its first agent died with 34 files uncommitted; see handoff §2. Three defects found and fixed (§7): Angular `isLoading()` is not TanStack's and was tearing pages down mid-refetch, a dropped unknown-game-type guard, and `display: inline` component hosts eating every `space-y-*` gap. |
```

Deferred-decisions table: **no change.** This slice needed no chart library
and made no deferred call.

---

## 10. What later slices owe, from here

- **Sub-feature 4 (friends):** V1's nav-bar `space-x-2` is §7.3's root cause,
  not `display: contents`. The nav's mobile-menu button host is
  `display: contents`; the fix is `gap-2` on that container.
- **Sub-feature 6 (dashboard):** nothing from here.
- **Phase 5 (identification games):** replace
  `AssignmentGameHostComponent` — one file. Do not make the play page branch
  on game type. Also owns `classes.spec.ts` test 4 and the four
  `assignment-play-*` baselines, and must replace
  `defaultAssignmentConfig()` with a read of each `GameDefinition`'s own
  `defaults` (§4).
- **Phase 6 (note game):** same seam; the note game's config stays
  snake_case (§4).
- **Everyone:** §7.1's `isLoading()` rule and §7.3's host-`display` rule.
  Both are cheap to apply and expensive to find.
