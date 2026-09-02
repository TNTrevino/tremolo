# Phase 3, sub-feature 2 handoff — public pages (home + about)

Status: **built**. `npm run build`, `npm run lint`, `npm run test:run` and
`npm run format:check` all exit 0 (**158 unit tests in 23 files**, up from
146 in 21). All **8/8 screenshot shots pass** against
`.migration/baselines/` at the suite's own `maxDiffPixelRatio: 0.01`.

The smallest slice in Phase 3, and the only one with no service, no form,
no `rxResource` and no backend. Sub-feature 1's §2 pattern held with
nothing bent — see §4.

**Sub-features 3–6 read §6.** It is one kit-level finding, it is *not* a
defect, and it will show up in your screenshot numbers too. Knowing about
it saves you the twenty minutes it cost here.

---

## 1. What exists now

| Area  | Files (all under `frontend/src/app/public/`)                    |
| ----- | --------------------------------------------------------------- |
| Home  | `home-page/home-page.component.{ts,html}` (+ spec, 7 tests)      |
| About | `about-page/about-page.component.{ts,html}` (+ spec, 5 tests)    |

Both replaced a Phase 1 placeholder that rendered a bare `<h1>`. Nothing
else in the app changed: no route edits (Phase 1 already wired
`/home` and `/about` with `loadComponent`), no kit edits, no new
dependencies, no `styles.css` change.

The layout is `public/<page-name>/`, **not** `public/components/<page-name>/`
— PLAN.md §4 shows `public/` as a flat leaf (`← guest pages: home, about`)
and Phase 1 already put the placeholders there. Sub-feature 1's §2.1
`components/` level is a `features/` convention; `public/` has no models or
services to be a sibling of.

**`/` is not home.** The root path redirects to `/note-game` (app.routes.ts,
and `navigation.spec.ts` pins it). "Home" is the `/home` path — a marketing
landing page you only reach from the logo or a direct link.

---

## 2. What each page is

### Home (`/home`)

Five sections, ported one for one from `frontend-react/src/pages/HomePage.tsx`:

1. **Hero** — DESIGN.md rule 5 exactly: paper background, five faint
   engraved staff lines (`bg-foreground/10`, `h-px`, absolutely positioned
   and `aria-hidden`), a one-color `font-display` ink headline, and a single
   brass `size="xl"` CTA to `/note-game`. No gradient anywhere.
2. **Features** — three cards (Note Recognition Game / Rhythm Practice /
   Track Progress) with tinted icon tiles, `group-hover:scale-110`.
3. **How It Works** — three numbered steps on `bg-muted/30`.
4. **Built For Everyone** — three audience cards (Music Teachers /
   Students / Musicians).
5. **Final CTA** — a `default` button to `/note-game` and an `outline`
   button to `/sheet-music`.

Brass appears **once** on the page (DESIGN.md rule 4): the hero CTA. The
closing "Start Note Game" is deliberately `default`, not brass — that is
React's choice and it is the right one.

### About (`/about`)

Mission card → "For Music Educators" (3 rows) → "For Developing Musicians"
(2 rows) → vision card. Static prose, no state, no request.

---

## 3. Two structural choices worth knowing

### 3.1 Data where React repeated itself; template where it did not

React wrote the three feature cards and the three audience cards out
longhand and *mapped* over the How It Works steps and the staff lines.
About wrote all five highlight rows out longhand.

The port keeps the loops React had and adds one: About's five highlight
rows are `readonly Highlight[]` on the component, because they are five
copies of the same six-line block differing only in icon, tint and copy.
The cards stay longhand, because each one's tile classes and hover
behaviour differ enough that a data model would be a lookup table pretending
to be a design. Rendered DOM is identical either way, which is what the
baselines care about.

### 3.2 Tint classes are complete literals, on purpose

`about-page.component.ts` holds

```ts
const PRIMARY_TILE = "flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 …";
const BRASS_TILE   = "flex-shrink-0 w-12 h-12 rounded-lg bg-brass/10 …";
```

and the template binds `[class]="item.tileClass"`. It does **not** carry a
`tone: "primary" | "brass"` that a template turns into `` `bg-${tone}/10` ``.

Tailwind's scanner is a text search over `content: ["./src/**/*.{ts,html}"]`.
A literal in a `.ts` file **is** scanned and emitted; a string assembled at
runtime never is, so `bg-brass/10` would silently not exist and the tile
would render transparent. Same trap sub-feature 1 recorded as its deviation
#5 (the password-strength colours). A spec asserts the rendered classes so
this cannot rot.

**Rule for later sub-features: a class string may live in a `.ts` file, but
it must be written out whole.**

---

## 4. Deviations

| #   | What the plan/packet said                                          | What was done                                                    | Why                                                                                                                                                                             |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Sub-feature 1 §2.1: pages live in `<feature>/components/<page>/`     | `public/<page>/`, no `components/` level                          | PLAN.md §4 draws `public/` as a flat leaf and Phase 1's placeholders were already there. The `components/` level exists to sit beside `models/` and `services/`; `public/` has neither. |
| 2   | Packet §"Uniform rules": every page consumes via `rxResource` (D6)   | Neither page fetches anything                                     | Both are static marketing copy. Sub-feature 1 made the same call for the same reason (its deviation #1). Sub-feature 3 remains D6's first honest consumer.                        |
| 3   | DESIGN.md rollout step 3: "apply `font-display` to headings"         | About's `h1`/`h2`/`h3` stay `font-sans`; Home's `h1`/`h2` are `font-display` | React applied `font-display` on HomePage only, and the baselines were captured from React. Parity wins over a literal reading of the rollout — see §5.                             |
| 4   | DESIGN.md rule 5: "no gradient washes"                              | About's vision card keeps `bg-gradient-to-br from-primary/5 to-brass/5` | Rule 5 governs **the hero**, and the hero has no gradient. This is a 5%-opacity wash on one card that the baseline contains. Flagged, not changed — restyling is not this slice's call. |

Nothing else deviated. No new dependency (R6 not invoked), `e2e/` and
`baselines/` untouched, `frontend-react/` read only, `STATE.md` not edited.

---

## 5. Verification actually run

```
npm run build         exit 0
npm run lint          exit 0   (--max-warnings 0)
npm run test:run      exit 0   158 tests, 23 files  (was 146 in 21)
npm run format:check  exit 0
```

New specs: `home-page.component.spec.ts` (7),
`about-page.component.spec.ts` (5).

Both drive the DOM the way the E2E suite does — headings, card titles, link
`href` and text, `aria-hidden` on every `<ng-icon>` — because
`navigation.spec.ts` asserts only that these two routes resolve and
`friends-and-theme.spec.ts` only borrows them as a place to click the theme
toggle. **Nothing in `e2e/` asserts a word of this copy.** If these specs go,
so does the only automated check on it.

### Screenshot parity — **8/8 pass**

Diffed against `.migration/baselines/` at the suite's own
`maxDiffPixelRatio: 0.01`, using a throwaway config outside `e2e/` (deleted
after the run; the committed `baselines.spec.ts` photographs all 20 routes
in one test and most are still placeholders). Dev server on `:4711` — these
pages make no API call, so the Go service's `ALLOWED_ORIGINS` does not
apply and `:4200` was left free for the parallel sub-features.

Re-run at `maxDiffPixelRatio: 0` to get a number per shot:

| Shot                 | Image size | Differing px | Ratio     |
| -------------------- | ---------- | ------------ | --------- |
| `home-desktop-light` | 1280×2314  | 52           | 0.0000176 |
| `home-desktop-dark`  | 1280×2314  | 35           | 0.0000118 |
| `home-mobile-light`  | 390×4306   | 185          | 0.000110  |
| `home-mobile-dark`   | 390×4306   | 203          | 0.000121  |
| `about-desktop-light`| 1280×1858  | 46           | 0.0000193 |
| `about-desktop-dark` | 1280×1858  | 25           | 0.0000105 |
| `about-mobile-light` | 390×3966   | 181          | 0.000114  |
| `about-mobile-dark`  | 390×3966   | 193          | 0.000122  |

Every shot is **two to three orders of magnitude under threshold**. The
residual is not scattered antialiasing — it clusters in three or four tight
bands per shot, and §6 is what they are.

Layout is pixel-exact: the hero staff lines, the headline, every card box
and tile, the numbered circles, both button rows, every heading and every
paragraph line-break land on the baseline's pixels at both viewports in both
themes. No `display: contents` gap, no `space-y-*` collapse, no card-part
override lost — sub-feature 1's three §7 fixes were already in place and
carried the whole port.

---

## 6. The one finding: `@ng-icons/lucide` ships a **newer lucide** than `lucide-react`

Every pixel of every diff, minus a few of light-theme text antialiasing, is
three icon glyphs that lucide **redrew** between the version `lucide-react`
pins and the version `@ng-icons/lucide` pins:

| Glyph          | Where it shows up                              | What changed                                     |
| -------------- | ---------------------------------------------- | ------------------------------------------------ |
| `lucideSchool` | Home, "Music Teachers" card                    | Roof/facade redrawn — pointier, different windows |
| `lucideBrain`  | About, "Customizable Learning Paths" row       | Gains internal fold detail; outline reshaped      |
| `lucideMoon`   | **The nav bar theme toggle — i.e. every page** | Crescent curve subtly different                   |

Confirmed by cropping expected vs. actual at 3× on each diff band. Text,
spacing and box geometry are identical inside those crops; only the path
data differs.

**This is not a bug and there is nothing to fix.** It is 25–203 px on a
2–4 megapixel page. The relevant points for whoever comes next:

- **It is a floor, not a regression.** Every route in the app renders the
  nav bar, so **every remaining sub-feature inherits the `lucideMoon` band**
  (~15–150 px depending on viewport) before it draws anything of its own. If
  your shot is a few dozen pixels off, that is probably all it is — crop the
  band before you go hunting.
- **Do not chase it by hand-editing SVG paths.** Pinning `@ng-icons/lucide`
  to a matching lucide release is the only honest fix, it is a dependency
  change (R6), and it would buy 0.01% of a screenshot. Not worth it.
- **Do check the band anyway.** The cheap way to tell an icon-version diff
  from a real defect is that an icon diff is a tight box the size of the
  glyph with correct geometry around it, where a real defect shifts
  everything after it.

Recorded here rather than in `STATE.md` per the worktree rules; whoever
verifies Phase 3 may want to promote it to a note on the icons decision (D12).

---

## 7. What this slice owes the others

**Nothing.** No shared file was touched, so there is no merge surface with
sub-features 3–6 beyond `.migration/`. Sub-feature 1's §9 said this slice
owed nothing to it, and that held in both directions.

Two things carried forward that are worth repeating:

- **A `class` string in a `.ts` file must be written out whole** (§3.2).
- **Icons: `<ng-icon size="1.25rem">`, never `h-5 w-5`; `aria-hidden="true"`
  on every decorative one.** Sub-feature 1's §7.2 and §4 respectively. Both
  applied to all 11 icons here and both specs assert the second.

---

## 8. Ledger line

```
| 3.2 | public (home + about) | built | 2 commits, c7feb12..deddec3 | 158 tests / 23 files (+12 / +2) · 8/8 screenshots pass · build+lint+format clean |
```
