# Phase 3, sub-feature 6 handoff — dashboard + the chart decision

**Status:** built, not verified (R4 — a fresh agent runs the exit criteria).
**Commits:** `3e92b99..769d3e2` (8 commits, 29 files, +3,336).
**Worktree:** `worktree-agent-a1d3e5bac6bd70213`. Not pushed.

This sub-feature owned two things: the dashboard route, and the chart-library
decision PLAN.md §2 deferred to Phase 3. Both are done. Section 2 is the one
a later reader is most likely to come back for.

---

## 0. How this run happened — read this before trusting section 2's voice

This slice was built by **two agents**. The first made the chart decision,
built the charts, the service slice, the models and most of the dashboard
components, then died mid-run at an API limit with its last status being
"now the dashboard page spec." The second (this one) audited what was on
disk, salvaged it, finished it, and wrote this document.

That matters for exactly one section. **The chart decision in §2 is the first
agent's**, and its rationale here is *reconstructed* — from the decision's own
commit message (`45a7742`, which is unusually complete and quotes its `npm
view` output verbatim), from the shape of the code it produced, and from a
**fresh, independent R6 re-verification run by the second agent** (§2.2). Every
factual claim in §2 was re-checked against npm today and is marked with what
was verified rather than inherited. Where the reconstruction is inference
rather than record, it says so.

Nothing else in this document is second-hand.

---

## 1. What exists now

```
shared/
├── models/{user,chart}.models.ts          DTO + domain types
├── utils/user.mapper.ts                   mapGeneralUserInfo
├── services/user.service.ts               the dashboard's 4 endpoints (D5)
└── components/charts/
    ├── chart-scale.ts                     the arithmetic recharts did for us
    ├── tremolo-line-chart.component.*     the line chart, SVG + d3-shape
    └── activity-heatmap.component.*       the heatmap, hand-rolled SVG

features/dashboard/components/
├── dashboard-page/                        4 rxResources, the page (D6)
├── performance-chart/                     interval + metric + view toggles
├── user-profile-card/                     ← the auth.spec.ts contract
├── dashboard-stats/                       the four-up stat grid
├── teacher-dashboard/                     teacher-only card
└── dashboard-skeleton/                    first-load placeholder
```

The `/dashboard` route already existed (Phase 1 placeholder); this fills the
component in. No routing changes.

### The four endpoints

| resource       | endpoint                            | refetches when      |
| -------------- | ----------------------------------- | ------------------- |
| `profile`      | `/api/users/:id/general-info`       | the signed-in id    |
| `chart`        | `/api/charts/user/:id/metrics`      | id **or** interval  |
| `classMetrics` | `/api/charts/teacher/class-metrics` | interval (teachers) |
| `activity`     | `/api/note-game/activity`           | the signed-in id    |

All four verified against `backend/main/controllers/` — paths match.

---

## 2. THE CHART DECISION — `d3-shape`, and what it beat

**Decision: adopt `d3-shape` and draw the marks ourselves. Neither shortlisted
Angular chart library is adopted.**

PLAN.md §2's deferred entry shortlisted `@swimlane/ngx-charts@25` and
`ng2-charts@10`, and allowed a hand-rolled SVG heatmap. The outcome went
further than the shortlist: *both* charts are hand-drawn, and the only thing
taken from a library is the curve interpolator.

### 2.1 Why — the reconstructed rationale

Three grounds, in the order they actually decide it:

**(a) Both candidates require `@angular/cdk`, which this app does not have and
has already declined once.** `ngx-charts` peers it, `ng2-charts` peers it, and
`npm ls @angular/cdk` in this repo returns empty. STATE.md's Phase 2 deviation
2 is the precedent: a dialog was rendered in place rather than portaled
specifically because "a portal needs `@angular/cdk`, a dependency this packet
does not authorise." Adopting a chart library would have pulled in the
dependency Phase 2 refused, to draw two charts. `ngx-charts` additionally
peers `@angular/animations` (absent) and the legacy
`@angular/platform-browser-dynamic`.

**(b) Bundle weight.** Measured today via `npm view <pkg> dist.unpackedSize`:

| package                    | unpacked   |
| -------------------------- | ---------- |
| `d3-shape`                 | 247 KB     |
| `@swimlane/ngx-charts`     | 2,292 KB   |
| `ng2-charts` + `chart.js`  | 56 KB + 6,179 KB = **6,235 KB** |

`ngx-charts` also carries **13 d3 packages plus `gradient-path`** at runtime
(verified: `npm view @swimlane/ngx-charts dependencies`). One of those 13 is
`d3-shape@^3.2.0` — the exact package adopted here. Taking `d3-shape` directly
is taking the piece of `ngx-charts` that does the work and leaving the
wrapper, the other twelve d3 packages, and the cdk peer behind.

> The decision commit says "14 d3 packages"; the true count is 13 d3 packages
> plus `gradient-path` plus `tslib`. Corrected here rather than repeated.

**(c) DESIGN.md control.** This is the ground the *code* argues, and it is
inference from the code rather than something `45a7742` states outright. The
charts are styled entirely in `currentColor` / CSS custom properties, so they
follow the light/charcoal token flip in `index.css` for free, and the brass
accent lands exactly where DESIGN.md rule 4 puts it. A themed chart library
would have meant re-deriving the palette into the library's own colour-scheme
API and keeping the two in sync. There is no theming shim in this slice, which
is the observable consequence.

**(d) The precedent that makes (a) more than fussiness.** Two libraries have
already failed R6 outright on an Angular peer range — `lucide-angular` (D12)
and `ngx-toastr` (D13). `d3-shape` declares **no `peerDependencies` at all**,
so it cannot fail R6 on this or any future Angular bump. That is the
structural argument, and it is the one the commit message leads with.

**A real cost, stated plainly:** the two candidates were rejected in favour of
maintaining ~700 lines of chart code (`tremolo-line-chart` 507 + `chart-scale`
107 + heatmap 285, less tests). That is the trade. It is defensible here
because the app draws exactly two chart types and both already existed as
bespoke recharts configurations, not because hand-rolling charts is generally
cheaper.

### 2.2 R6 verification — re-run fresh, 2026-08-20

```
npm view d3-shape version license peerDependencies dependencies
  version      = 3.2.0
  license      = ISC
  peerDependencies = (none declared)
  dependencies = { d3-path: '^3.1.0' }

npm view @types/d3-shape version license peerDependencies
  version      = 3.1.8
  license      = MIT
  peerDependencies = {}
```

Installed and pinned in `frontend/package.json`: `d3-shape@^3.2.0`
(dependencies), `@types/d3-shape@^3.1.8` (devDependencies). `npm ls` resolves
`d3-shape@3.2.0` and `@types/d3-shape@3.1.8`.

**No Angular peer coupling on either package** — neither declares a peer of
any kind, so R6's `@angular/core` range check is vacuously satisfied and stays
satisfied across Angular upgrades. Licences ISC and MIT, both permissive, both
compatible with the repo.

The rejected candidates, re-verified verbatim today:

```
npm view @swimlane/ngx-charts@25.0.1 peerDependencies
  @angular/animations, @angular/cdk, @angular/core, @angular/common,
  @angular/forms, @angular/platform-browser,
  @angular/platform-browser-dynamic  →  '^21.2.0 || ^22.0.0'
  rxjs → '7.x'

npm view ng2-charts@10.0.0 peerDependencies
  @angular/platform-browser, @angular/common, @angular/core,
  @angular/cdk  →  '>=21.0.0'
  chart.js → '^3.4.0 || ^4.0.0'
  rxjs → '^6.5.3 || ^7.4.0'
```

**Both pass R6 on the Angular range.** Neither was rejected for R6 failure —
that is the honest framing, and it is the framing `45a7742` itself uses. They
lost on the cdk peer, on weight, and on styling control.

### 2.3 What `d3-shape` is actually used for

One import, one call site:

```ts
import { curveMonotoneX, line as d3Line } from "d3-shape";
```

used once in `tremolo-line-chart.component.ts` to build the path `d`
attribute. No `d3-scale`, no `d3-array`, no `d3-axis`, no `d3-selection` — the
scales, ticks and label thinning are hand-rolled in `chart-scale.ts` so they
can be unit-tested. The heatmap does not import d3 at all.

This is the substantive parity argument for the choice: React's
`<Line type="monotone">` **is** d3-shape's `curveMonotoneX` (recharts delegates
to it), so the ported line is the same interpolation algorithm rather than a
lookalike curve.

### 2.4 STATE.md ledger — not written by this agent

`.migration/STATE.md` was **not edited** (worktree rule). Its
deferred-decisions table still reads:

```
| Chart library (replaces recharts)  | 3     | _undecided_ |           |
```

The verifier should set it to:

```
| Chart library (replaces recharts)  | 3     | `d3-shape@3.2.0` (curve only; marks hand-drawn in SVG). Rejected `@swimlane/ngx-charts@25` and `ng2-charts@10` — both pass R6 but both peer `@angular/cdk`, which Phase 2 declined. | phase-3-subfeature-6-handoff.md §2 |
```

Phase 3's exit criterion "Chart decision recorded in STATE.md" is therefore
**not yet met** and is the verifier's to close.

---

## 3. The dashboard page — what is worth knowing

### 3.1 `params: () => undefined` is the port of TanStack's `enabled`

A resource whose `params` callback returns `undefined` stays idle and fires
nothing. That is how two things stay correct without an `if` in the template:
a student's `classMetrics` never fires (the endpoint 403s for students), and
nothing fires at all before `AuthStore` has a user. A spec pins the second
("fires nothing at all while the store has no user").

### 3.2 The skeleton keys on `status() === "loading"`, never `isLoading()`

`isLoading()` is also true while **reloading**, so keying the skeleton on it
would blank the entire dashboard every time the interval changed. React's
`isPending` was false whenever data was on screen; `"loading"` is the signal
that means the same thing. This is the single most copy-worthy line in the
slice and PLAN.md §5.2 already flags the distinction — this is the first
consumer that actually depends on it.

### 3.3 The heatmap keeps its own three states

`activity` is fetched separately and rendered with its own
loading/error/value block inside the page, and the dashboard skeleton
deliberately does not cover that card. So a slow or failing activity request
degrades one card instead of taking the dashboard down — which is what
React's separate `useActivityHeatmap` hook did.

### 3.4 The notice debt from sub-feature 1 is paid

Sub-feature 1's handoff §2.5 recorded that this page owed
`AuthStore.takeNotice()` for the Google callback's "Your Google account has
been linked…" message, or the message would be silently dropped. The page
reads it once at construction and renders it as a
`border-2 border-primary bg-primary/10` banner, matching React. A spec pins
that it shows exactly once and does not survive a reload.

### 3.5 `formatTimeReading` is an estimate, carried deliberately

The Go service stores no session duration, so React multiplied sessions by an
assumed five minutes. Carried over verbatim so the number on the dashboard
does not silently change. It is not a measurement and should not be presented
as one.

---

## 4. Audit and salvage note

Everything the first agent left was audited before being kept. What was found:

- **All four of its commits and all of its uncommitted work passed the gates
  unchanged.** Nothing was reverted, and nothing needed a fix to go green.
- The dirty tree held **more than its status implied** — not just the page
  spec, but the heatmap (with spec), and the teacher-dashboard and
  user-profile-card components. It had got further than it reported.
- The uncommitted work was committed as **four logical units** bottom-up
  (heatmap → performance-chart card → the four presentational cards → the
  page + its spec) rather than as one salvage commit.
- Kit rules from sub-feature 1 §7 were checked and hold: no `h-*`/`w-*`
  sizing on any `<ng-icon>` (all use `size=`), and every dashboard component
  sets `host: { class: "block" }` so the page's `space-y-6` actually applies
  across it (§7.3 — margins are ignored across a `display: contents` host).
- §5.6 hygiene holds: no `ngOnDestroy`, no stored `Subscription`, no
  `takeUntil`, no `shareReplay` anywhere in the slice. The line chart's
  `ResizeObserver` tears down via `inject(DestroyRef).onDestroy(...)`, which
  is the approved non-RxJS shape.

**One stale-process cleanup:** the first agent had left an `ng serve` running
on `:4300` that was serving the **main checkout**, not this worktree. It was
identified by its `CLAUDE_CODE_SESSION_ID` (same session), stopped, and
replaced with a server on the worktree. Anyone reading old `:4300` results
from before 18:33 today was reading the wrong tree.

---

## 5. Verification actually run

```
npm run build         exit 0
npm run lint          exit 0   (--max-warnings 0)
npm run format:check  exit 0
npm run test:run      exit 0   234 tests, 30 files
```

New specs in this slice, **51 tests**: `dashboard-page.component.spec.ts` (15),
`tremolo-line-chart.component.spec.ts` (12), `chart-scale.spec.ts` (10),
`activity-heatmap.component.spec.ts` (8), `user.service.spec.ts` (6).

### 5.1 Parity suite — `e2e/` was NOT edited

Confirmed by `diff -r` against the main checkout: **byte-identical**.
Run with `E2E_BASE_URL=http://localhost:4300`, Go on `:5001`.

| Slice                       | Result      | Notes                                                     |
| --------------------------- | ----------- | --------------------------------------------------------- |
| **`auth.spec.ts`**          | **5 / 5** ✅ | **Was 4/5 through sub-feature 1. The known failure — "signs in and lands on the dashboard", which asserts the user's full name is visible — now passes.** It is `UserProfileCardComponent`'s `<h1>` that fixes it. |
| `navigation.spec.ts`        | 21 / 21     | No regression.                                            |
| `friends-and-theme.spec.ts` | 3 / 4       | Unchanged. The one failure is the friends panel heading — **sub-feature 4's**, exactly as recorded in sub-feature 1's handoff and Phase 2's. Not touched by this slice. |

**The acceptance criterion for this sub-feature is met.**

### 5.2 Screenshot parity — `/dashboard`, both viewports, both themes

Baselines were **not** modified (`git status` on `.migration/baselines/` is
empty; file mtimes unchanged). Shot with an ad-hoc config outside `e2e/`, at
the suite's own `maxDiffPixelRatio: 0.01`, seeding a student named
"Baseline Student" because that is the name the committed baselines were
captured with and the dashboard renders it in an `<h1>`.

**Unmasked, against `.migration/baselines/`: 4 / 4 pass.**

| shot             | result |
| ---------------- | ------ |
| desktop / light  | pass   |
| desktop / dark   | pass   |
| mobile / light   | pass   |
| mobile / dark    | pass   |

That is a clean sweep — notably better than sub-feature 1's login/signup
result, which had a known residual from two deliberate restyles. Nothing on
this route is outside threshold.

**Masked (PLAN.md §1 chart carve-out): 2 / 4 — and the two failures are an
artifact of the method, not a parity defect.**

| shot             | result | diff                        |
| ---------------- | ------ | --------------------------- |
| desktop / light  | fail   | 140,101 px (ratio **0.10**) |
| desktop / dark   | fail   | 142,185 px (ratio **0.10**) |
| mobile / light   | pass   |                             |
| mobile / dark    | pass   |                             |

**Why, and why it is not a finding.** Playwright paints a mask into the
**candidate only**; the baseline on disk is a static PNG. The committed
baselines were captured by `e2e/baselines.spec.ts`, which masks **only the
OSMD staff** — chart interiors are baked into them unmasked. So masking the
candidate necessarily diffs magenta against the baseline's real heatmap
pixels, and 0.10 of a 1280-wide full-page shot is almost exactly the heatmap's
area. The mobile shots pass only because the heatmap is a smaller fraction of
a tall 390-wide page.

**The carve-out does not apply to this route in this state anyway.** It exists
for *randomly generated* content. The baseline dashboard belongs to a freshly
seeded student with **zero games played**, so both chart regions are
deterministic: the line chart is absent (its "Not enough data yet" empty state
is shown) and the heatmap is a uniformly empty grid. There is nothing random
to mask. **The unmasked 4/4 is therefore the meaningful number**, and it is
meaningful precisely because the content is deterministic.

**Carve-out, second half — "assert separately that the region rendered
non-empty"** — run and passing:

```
HEATMAP 1036x151.578125, 369 cells
PERFORMANCE CARD: empty-state copy shown (0 games seeded)
```

### 5.3 A harness gap this slice exposes — worth carrying forward

**No screenshot, in any phase, has ever exercised a chart that actually draws
a line.** The baseline student has no game history, so every dashboard
baseline captures the empty state. Validating the line chart against React
would need score entries spread across **multiple days**, and the Go API
offers no way to backdate an entry — it would take direct DB writes, which is
outside this sub-feature's remit.

The consequence is concrete and is why §6's findings F1–F3 are recorded rather
than fixed: **the plotted chart is currently unverified against React by any
instrument.** Recommend Phase 7 or the verifier add a seeded-history fixture.

---

## 6. Deviations and open findings

### Deviations (decided, and why)

**D-1 — Both charts are hand-drawn, not just the heatmap.** PLAN.md §2
sanctioned hand-rolling the heatmap only. The line chart is hand-rolled too.
See §2. Recorded as a deviation because it goes beyond what the plan
authorised, even though it follows from the same reasoning.

**D-2 — The line chart's legend is now real controls.** React rendered
recharts' `.recharts-legend-item` `<span>`s; the port renders
`<ul>/<li>/<button aria-pressed>`. A keyboard user can now toggle a series,
which they could not before. Verified safe: **no spec in `e2e/` references a
legend, a chart, or `recharts` at all**, and none uses `getByRole("img")`.

**D-3 — Two new accessible names** that did not exist in React:
`aria-label="Chart interval"` on the interval `<select>` and an `ariaLabel` on
each chart `<svg role="img">`. Same verification as D-2.

**D-4 — The heatmap tooltip is a `<title>` element**, not a hover card. This
makes the cells reachable by screen reader, which React's div-based grid was
not. Visual output is unchanged.

**D-5 — `TeacherDashboard` reproduces a React bug on purpose:** its
`<Button asChild>` never honoured `asChild`, so React shipped a `<button>`
wrapping an `<a>`. Reproduced rather than corrected, because the baselines
were captured from that markup. Flagged for whoever cleans up the kit.

**D-6 — `PerformanceChart`'s teacher props lost their compile-time guarantee.**
React used a discriminated union (`isTeacher: true` ⇒ `viewMode` and
`onViewModeChange` required). The port uses two independent inputs with
defaults. Runtime behaviour is identical; the type-level guard is gone.

### Open findings — NOT fixed, and deliberately so

These came out of a line-by-line audit of the chart ports against the React
originals. **None is verifiable by any current instrument** (§5.3), which is
why they are recorded rather than patched: a blind change to the axis of every
chart, unverifiable by the harness, is exactly what R1/R5 exist to prevent.
They are listed most-visible first, with file and line.

**F1 — auto Y domain is padded outward where recharts used the exact data
extent.** `tremolo-line-chart.component.ts:293` returns `niceScale(min, max)`,
which rounds outward to whole steps (`chart-scale.ts:58-59`). In React the
line touched the top and bottom of the plot box; here it floats inside a
padded box. **This is the one to look at first** — it would change every
dashboard that has data.

**F2 — a fixed `yDomain` yields different tick labels.**
`tremolo-line-chart.component.ts:270-276`: `yDomain=[0,100]` gives
`0,20,40,60,80,100`; recharts with `tickCount:5` gave `0,25,50,75,100`. Note
that `tremolo-line-chart.component.spec.ts:154` **pins the Angular values**,
so the spec locks the difference in rather than catching it. A non-round fixed
domain also loses its top tick (`[0,90]` → no gridline at 90).

**F3 — the tooltip never flips at the right edge.**
`tremolo-line-chart.component.ts:472` sets `left = x + 12` and clamps only
`top`, so at the last few points the tooltip overflows the card. recharts
repositioned it.

**F4 — smaller ones**, for completeness: reference-line values widen the auto
domain, where recharts' default `ifOverflow: 'discard'` dropped out-of-range
ones (`:289-292`); the crosshair spans the full SVG rather than the plot box
(`.html:88-97`); `niceScale`'s degenerate pad is proportional, so a flat 100%
accuracy series renders an axis of 50–150 (`chart-scale.ts:52`); and the
pre-measurement width falls back to a fabricated 640 px (`:214-216`), which
matters for a chart first painted inside a collapsed container.

**F5 — `performance-chart` has no spec.** It is the only component in the
slice without one. Its logic (series definitions, the `length < 2` guard, the
average reference line, the `transformChartData` zip) is currently covered
only indirectly, through the dashboard page's specs.

### One nit for the verifier

Phase 3's Verify block runs
`grep -ri "tanstack\|useQuery\|queryClient" src/` and expects no matches.
It now returns **3 matches, all of them English prose in comments** — two in
`dashboard-page.component.ts` explaining that TanStack's `enabled` became
`params: () => undefined`, and one pre-existing in `music.service.ts` from an
earlier phase. There is no TanStack-shaped *code*. The grep as written cannot
tell the difference; the criterion is met.

---

## 7. What the verifier should do

1. Set the STATE.md deferred-decisions row per §2.4 — the exit criterion
   "Chart decision recorded in STATE.md" is open by design (worktree rule).
2. Re-run the gates and the three parity specs; `auth.spec.ts` should be 5/5
   and `friends-and-theme.spec.ts` should still be 3/4 (sub-feature 4's).
3. Re-run the unmasked dashboard screenshots — 4/4. Do **not** re-run them
   masked against the committed baselines and read the 0.10 as a regression;
   §5.2 explains why that number is a method artifact.
4. Decide whether F1–F3 are this migration's problem or a follow-up, and
   whether §5.3's harness gap gets closed.

### Ledger line for STATE.md row 3

> **Sub-feature 6 (dashboard) built** `3e92b99..769d3e2` — dashboard page on
> four `rxResource`s, the five dashboard components, and both charts
> hand-drawn in SVG. **Chart decision made: `d3-shape@3.2.0`, curve only**
> (`@swimlane/ngx-charts@25` and `ng2-charts@10` both pass R6 but both peer
> `@angular/cdk`, which Phase 2 declined; see
> `phase-3-subfeature-6-handoff.md` §2). build/lint/test:run/format:check all
> exit 0 (234 tests, 30 files; +51 in this slice). **`auth.spec.ts` 5/5 — the
> suite's one known failure since Phase 3.1 is fixed**; `navigation.spec.ts`
> 21/21; `friends-and-theme.spec.ts` 3/4 (sub-feature 4's, unchanged).
> `/dashboard` screenshots 4/4 unmasked against baselines, both viewports and
> themes. 6 deviations and 5 open chart findings in the handoff; the
> deferred-decisions row still needs writing. Built by two agents — the first
> died mid-run, the second audited and finished; §0 and §4 say what that
> means.
