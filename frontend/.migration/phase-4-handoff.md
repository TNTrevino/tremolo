# Phase 4 handoff — Sheet music / OSMD

Status: **built**. `npm run build`, `npm run lint`, `npm run test:run` and
`npm run format:check` all exit 0 (**146 unit tests in 21 files**, up from 109
in 17). Both pages were driven in Chromium against the live Python service on
:8000, and the eight baseline screenshots for `/sheet-music` and `/convert`
(2 routes × 2 viewports × 2 themes) all pass.

**Read §3 first if you are Phase 5 or 6** — it is the `SheetMusicComponent`
API you consume verbatim. **Read §7 if you are the orchestrator or a
verifier** — this phase shipped three fixes to defects it inherited, two of
them global.

---

## 1. What exists now

| Area                    | Files (under `frontend/src/`)                                                        |
| ----------------------- | ------------------------------------------------------------------------------------ |
| OSMD wrapper            | `app/features/sheet-music/components/sheet-music/sheet-music.component.{ts,spec.ts}`  |
| Card chrome around it   | `app/features/sheet-music/components/sheet-music-display/sheet-music-display.component.{ts,spec.ts}` |
| Sheet-music page        | `app/features/sheet-music/components/sheet-music-page/sheet-music-page.component.{ts,html}` |
| Converter page          | `app/features/sheet-music/components/converter-page/converter-page.component.{ts,html}` |
| Music HTTP              | `app/shared/services/music.service.{ts,spec.ts}`                                     |
| Wire types              | `app/shared/models/music.models.ts`                                                  |
| Notation boundary       | `app/shared/utils/music.mapper.{ts,spec.ts}`                                         |
| OSMD demo               | `app/dev/kit-page/kit-page.component.{ts,html}` (new "Sheet music (OSMD)" section)    |
| jsdom shim              | `test-setup.ts` (`ResizeObserverStub`)                                               |
| Global cascade fixes    | `tailwind.config.js` (`important: "html"`), `styles.css` (`:root ng-icon`)            |
| Build config            | `angular.json` (`allowedCommonJsDependencies: ["opensheetmusicdisplay"]`)             |

Both Phase 1 placeholders are gone; `app.routes.ts` was **not** touched — it
already lazy-loads these two component files by path.

---

## 2. The split, and why there are two components

React had a hook (`useOSMD`, imperative) and a component
(`SheetMusicDisplay`, declarative chrome). That split is load-bearing and is
kept:

- **`<app-sheet-music>`** is the hook. It renders **one `<div>`** and nothing
  else — no card, no spinner, no error panel — because the three callers draw
  different chrome. Phase 5's `QuestionBoard` has its own overlay and text
  fallback; Phase 6's note game has another.
- **`<app-sheet-music-display>`** is React's card: error panel, spinner over a
  400px skeleton, container hidden while either shows. It takes `musicXml` as
  an input and loads on change. **Only the two pages in this phase use it.**

---

## 3. `SheetMusicComponent` — the exact API (Phases 5 and 6 consume this)

```ts
import { SheetMusicComponent } from "@features/sheet-music/components/sheet-music/sheet-music.component";
```

Selector `app-sheet-music`. Host is `display: contents`, so the container div
— not a wrapper — is its parent's flex/grid item, and **a `class` written on
`<app-sheet-music>` styles nothing**; use `containerClass`.

### Inputs

| Input            | Type                      | Default                  | Notes                                                                                                                                                    |
| ---------------- | ------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zoom`           | `number`                  | `1`                      | OSMD zoom. Changing it sets `osmd.zoom` and **re-renders in place** — the score stays loaded, nothing refetches. Applied at construction for the first load. |
| `options`        | `IOSMDOptions \| undefined` | `undefined`            | Passed to the OSMD constructor. **Read once**, when the instance is created; later changes do not re-create it. React's `useOSMD` passed none — see §4.     |
| `ariaLabel`      | `string`                  | `"Sheet music display"`  | Set on the container. Pass **`"Music staff"`** on a game board: `e2e/support/app.ts` finds the staff by `/^(Music staff\|Sheet music display)$/`.           |
| `containerClass` | `string`                  | `""`                     | Classes for the container div.                                                                                                                             |

### Outputs

| Output           | Payload | Fires                                                          |
| ---------------- | ------- | -------------------------------------------------------------- |
| `renderComplete` | `void`  | after `render()` returns (React's `onRenderComplete`)           |
| `renderError`    | `Error` | for every failure `error` also records (React's `onError`)      |

### Public members

| Member                                    | Notes                                                                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `loadAndRender(xml: string): Promise<void>` | **Never rejects.** A failure sets `error`, emits `renderError` and resolves — React's `.catch().finally()`, ported. Branch on the signal or the output, not on a `try`. |
| `clear(): void`                           | `osmd.clear()` + resets `error`. Keeps the instance for the next load. Does **not** touch `isLoading` (clearing mid-load must not claim the request finished). |
| `isLoading: Signal<boolean>`              | true between the start of `loadAndRender` and its settling                                                                                  |
| `error: Signal<Error \| null>`            | last failure; cleared by `loadAndRender` and `clear`                                                                                        |
| `instance: OpenSheetMusicDisplay \| null` | getter. What React exposed `osmdInstanceRef` for — engraving rules, `setOptions`, reading the drawn SVG. **null until the first `loadAndRender`.** |

The instance is created lazily on the first `loadAndRender` (as in React) and
disposed in `ngOnDestroy`. That hook is legitimate: PLAN.md §5.6 bans
`ngOnDestroy` for *unsubscribe bookkeeping* and names disposing OSMD as the
case it exists for. **There is no subscription in the file.**

### Reading its state from a parent

`viewChild.required` throws if read before the view exists, so the display
component uses the optional form and lets the signal re-run its effect:

```ts
private readonly sheet = viewChild(SheetMusicComponent);
protected readonly isLoading = computed(() => this.sheet()?.isLoading() ?? false);
protected readonly error = computed(() => this.sheet()?.error() ?? null);

constructor() {
	effect(() => {
		const sheet = this.sheet();      // undefined on the first run,
		const xml = this.musicXml();     // defined on the re-run
		if (!sheet || !xml) return;
		void sheet.loadAndRender(xml);
	});
}
```

### `SheetMusicDisplayComponent`

Selector `app-sheet-music-display`, host `display: contents`.
Inputs: `musicXml` (**required**), `className`. Outputs: `renderComplete`,
`renderError`. No `zoom` passthrough — React had none, and a caller that
needs zoom wants the bare wrapper anyway.

---

## 4. OSMD options carried over

**None.** `useOSMD` constructed `new OpenSheetMusicDisplay(container)` with no
options object, so `/sheet-music` and `/convert` get OSMD's own defaults
(`autoResize: true`, credits/title/composer/part-names/measure-numbers all
drawn, zoom 1). The port passes `this.options()`, which those two pages leave
unset — the wire is identical.

The **game** display is a different React file (`features/note-game-display/`,
Phase 6's input, 219 LOC) and it *does* pass options. For reference, what it
uses today:

```ts
{ drawingParameters: "compacttight", drawCredits: false, drawTitle: false,
  drawComposer: false, drawPartNames: false, drawMeasureNumbers: false,
  drawTimeSignatures: false, autoResize: false }
osmd.zoom = 2.0                                  // 1.2–2.2 per game
osmd.setOptions({ defaultColorMusic: dark ? "#FFFFFF" : "#000000" })
EngravingRules.{Page,System}{Left,Right,Top,Bottom}Margin = 0
```

Feed the first object through `[options]`, the zoom through `[zoom]`, and do
the `setOptions`/`EngravingRules`/viewBox-centering work through `instance`.
**Phase 4 deliberately did not port the centering (`getBBox` → `viewBox`) or
the dark-mode recolour** — they belong to the game display Phase 6 owns, and
guessing their shape here would have been a rewrite, not a port.

---

## 5. `MusicService` and the notation boundary

`app/shared/services/music.service.ts`, `providedIn: "root"`. Observables out
(D5). It ports both the React service **and** the axios client it sat on
(`clients/music-client.ts`), since Angular has no separate client object: base
URL `${environment.musicApi}/music`, a 10s `timeout(...)`, and the
interceptor's error shaping.

| Method                      | Endpoint   | Returns                                                     |
| --------------------------- | ---------- | ----------------------------------------------------------- |
| `generateMary(MaryRequest)` | `/mary`    | `Observable<string>` — raw MusicXML                          |
| `generateRandom(RandomNotesRequest)` | `/random` | `Observable<string>` — raw MusicXML                 |

Two things Phases 5 and 6 must know:

1. **`responseType: "text"` is mandatory** for these two. They answer
   `application/xml`; without it Angular runs the MusicXML through
   `JSON.parse` and every call fails on the first `<`. The five game endpoints
   answer JSON and do not need it.
2. **Errors carry the service's own plain-text body.** `/mary` and `/random`
   fail with bodies like `The note Z is not currently supported…` and
   `something is not right!…`; the service turns those into
   `new Error(body)`, or `new Error("Music generation failed")` when there is
   no body, which is exactly what React's interceptor put on its `ApiError`.
   `getErrorMessage()` then finds `.message`. **No change was needed to
   `shared/utils/error.utils.ts`.**

**The notation boundary.** `shared/utils/music.mapper.ts` is the verbatim port
of React's mapper, and `MusicService` is its only caller:

```
fromMusic21NoteName("E-") === "Eb"      // wire -> UI
toMusic21NoteName("Eb")   === "E-"      // UI -> wire
```

Both are case-sensitive single `replace`s, so a natural `"B"` is left alone.
`music.mapper.spec.ts` pins the round trip in both directions over all seven
flats, all naturals and all sharps (React shipped no test for this file).

`grep -rn "Music21NoteName" src/app` returns the mapper, its spec, and
`music.service.ts` — nothing else. Keep it that way when you add the game
endpoints: convert `scale` / `tonicPool` / `rootPool` on the way out and
`noteName` / `tonic` / `minorTonic` / `root` on the way back, in the service.

`shared/models/music.models.ts` is the whole of React's `music.types.ts`,
ported now so Phases 5 and 6 do not each invent half of it.

---

## 6. R6 dependency checks

No dependency was added. `opensheetmusicdisplay` was already in
`package.json` and is pre-approved by PLAN.md §7 ("Keep — framework-agnostic").

| Package                  | Range in package.json | Installed | Peers | Verdict |
| ------------------------ | --------------------- | --------- | ----- | ------- |
| `opensheetmusicdisplay`  | `^1.9.3`              | **1.9.9** | **none declared** — `dependencies` only (`jszip@3.10.1`, `vexflow@1.2.93`, `loglevel`, `typescript-collections`, `@types/vexflow`) | **Adopted.** No `@angular/core` peer to check because it has no Angular surface at all; it is driven imperatively through a DOM element. Verified by building and by rendering real MusicXML in Chromium. |

One build note: OSMD is CommonJS, so `@angular/build` warned
`Module 'opensheetmusicdisplay' … is not ESM` (an optimization-bailout
warning, exit code still 0). `angular.json` now declares it under
`allowedCommonJsDependencies`, which is the documented remedy; the build is
warning-free again.

---

## 7. Three inherited defects this phase fixed

All three were found by the two instruments, not by eye. Each is a deliberate
divergence from the React app and is recorded as a deviation in §9.

### F1 — a staff that renders `width="0"` and never redraws (**React is broken too**)

OSMD writes the container's `clientWidth` onto the `<svg>` when it renders.
The card hides the container (`hidden`, i.e. `display: none`) while
`isLoading` is true, so whether OSMD draws into a laid-out box depends on
whether the hide lands before its async `load()` resolves. **It is a race, and
React loses it.** Driving `frontend-react` on :5173, 2026-08-20:

| generation | React `<svg>` box                       |
| ---------- | ---------------------------------------- |
| 1st (Mary) | `width="0" height="415"`, no layout box  |
| 2nd (rhythm) | `908 × 318` — correct                  |
| 3rd (Mary) | `width="0" height="415"`                 |

The faithful port reproduced it exactly, which is how it was found.

**Fix (in the wrapper, so Phases 5 and 6 inherit it):** render; if the
container had no width, attach a one-shot `ResizeObserver` and render once
more when it gets one. Torn down by `clear()` and `ngOnDestroy`. Angular now
gives `908 × 318` on every generation.

`test-setup.ts` gains a `ResizeObserverStub` — jsdom has no `ResizeObserver`
and reports `clientWidth` 0 for everything, so every unit-test load takes this
path and five specs drive the stub by hand.

### F2 — every icon in the app rendered at 1em (**Phase 2's, app-wide**)

Angular injects component styles into `<head>` **after** `styles.css`, as
`[_nghost-…] { … }` — class specificity. `@ng-icons` sizes its own host
(`width: var(--ng-icon__size, 1em)`), so it beat the Tailwind `h-N w-N`
written on it at all **47** call sites. Measured on `/sheet-music`, nav icons
were 14–16px against React's 16–24px.

**Fix:** `important: "html"` in `tailwind.config.js`. Tailwind's *selector*
strategy emits `html .h-6 { … }` — one element of specificity higher, and
**no `!important` anywhere**, so inline styles and genuine `!important` rules
still win. In React nothing competed with a utility in the first place; this
restores that cascade rather than inventing one.

### F3 — `<ng-icon>` sat on the text baseline

`<ng-icon>` is a custom element, so Tailwind preflight's
`svg { display: block; vertical-align: middle }` never reached it. React's
icons *were* `<svg>`. Left inline-block on the baseline it added a
descender's worth of line-box height — 6px on `/convert`'s empty state, ~3px
of vertical offset in the nav bar.

**Fix:** `styles.css` extends the preflight rule to `:root ng-icon`, inside
`@layer base` so a display utility written on an `<ng-icon>` still wins.
`:root` (not a bare `ng-icon`) because a type selector loses to
`[_nghost-…]`.

### And one of this phase's own

`space-y-*` puts a margin on each child, and `<app-button>` is a
`display: contents` host with **no box to take one**, so the three button
columns on `/sheet-music` stacked flush — 32px shorter than React. Changed to
`flex flex-col gap-2`, which lands the gap on the real `<button>` at the same
8px. **Phases 5 and 6: any `space-y-*` whose children are `<app-button>`,
`<app-form-field>`, `<app-form-label>`, `<app-form-error>`,
`<app-rhythm-glyph>` or `<app-dialog>` is silently a no-op.** Phase 2's
handoff §10 warned that these hosts swallow `class`; they swallow margins
too.

---

## 8. Verification actually run

```
npm run build        exit 0   (no warnings)
npm run lint         exit 0   (--max-warnings 0)
npm run test:run     exit 0   146 tests, 21 files
npm run format:check exit 0
```

New specs (37 tests):

| Spec | Tests | Covers |
| ---- | ----: | ------ |
| `sheet-music.component.spec.ts` | 18 | invalid XML → `error` set + `renderError` emitted + `loadAndRender` still resolves; valid XML → `renderComplete`; container renders with its accessible name and nothing else; lazy construction; one instance reused; `clear()`; zoom applied at construction and re-rendered on change; dispose on destroy; constructor failure recorded not thrown; the five F1 zero-width cases |
| `sheet-music-display.component.spec.ts` | 5 | loads on `musicXml` change; skeleton shown and container hidden while loading; error panel instead of a blank stave; staff re-shown after a later success |
| `music.service.spec.ts` | 7 | `responseType: "text"`; `"Bb"`→`"B-"` and `"Eb"`→`"E-"` on the wire for both endpoints; natural `"B"` untouched; plain-text error body surfaced; `"Music generation failed"` fallback; never talks to the main API |
| `music.mapper.spec.ts` | 7 | all seven flats both directions, naturals and sharps untouched, natural `"B"`, full round trip |

OSMD is mocked in the unit tests (`vi.mock("opensheetmusicdisplay")`): the
real library measures glyphs through SVG `getBBox` and canvas text metrics,
neither of which jsdom implements, so a spec that loaded it would be testing
jsdom's gaps. That it draws a real staff is a browser question, answered
below and by the E2E suite's `expectStaffRendered`.

### E2E parity suite — unmodified, `E2E_BASE_URL=http://localhost:4300`

- **`e2e/specs/navigation.spec.ts`: 21/21 pass**, including
  `serves /sheet-music to anyone` and `serves /convert to anyone`.
- There is **no dedicated sheet-music or convert spec** in `e2e/specs/`
  (R5 — the packet's Verify says "sheet-music/convert E2E specs"; the repo
  covers those two routes through `navigation.spec.ts` and
  `baselines.spec.ts`). Nothing was added: `e2e/` is read-only to this phase
  and `git log 24a3bba..HEAD -- frontend/e2e/ frontend/.migration/baselines/`
  is empty.
- `auth.spec.ts` fails 2 (the signed-in name is not visible after login; the
  signup page is still a Phase 1 placeholder) and `friends-and-theme.spec.ts`
  fails 1 (the friends panel, which Phase 2's handoff assigns to Phase 3).
  **All three fail identically with this phase's global CSS changes stashed**
  — verified by stashing `styles.css` + `tailwind.config.js` and re-running.
  They are pre-existing and not Phase 4's.

### Screenshot parity — 8/8

`/sheet-music` and `/convert`, desktop (1280×800) and mobile (390×844), light
and dark, full page, staff masked, against `.migration/baselines/` at the
repo's own thresholds (`maxDiffPixelRatio: 0.01`). **All pass.**

Run with an ad-hoc Playwright config in a scratch directory rather than by
editing `baselines.spec.ts` (which photographs all 20 routes in one test, 18
of them still placeholders). Geometry was also compared element-by-element
against React on :5173: after the §7 fixes, `/sheet-music`'s body height is
**1390px in both apps** and every measured element top matches exactly.

For the record, the same run over the other already-delivered routes: `/home`,
`/about` and `/signup` are Phase 1 placeholders (800px against React's
2314/1858/938) and `/login` differs by 64px — Phase 3 owns all four. The
global fixes **improved** `/login`'s diff at every viewport and theme
(desktop light 40481 → 38563 px, desktop dark 122380 → 120507, mobile light
33826 → 33405, mobile dark 58747 → 58352) and regressed nothing.

### Manual, against the live services (Chromium, :4300, Python on :8000)

- `/sheet-music`: empty state renders; **Bb Major → the POST body is
  `{"tonic":"B-","octave":4}`** (the boundary conversion, on the wire); the
  staff draws at 908×318; a 16th-note rhythm regenerates and draws at
  908×318 (this is the F1 case React fails); the selected rhythm button
  highlights.
- `/sheet-music` error path: a 400 from `/mary` shows
  **"Error: The note Z is not currently supported, reconsider you root note"**
  — the service's own copy, as in React — with "Please try again with
  different options" beneath it.
- `/convert`: all three validation messages appear verbatim
  (wrong extension → not XML → not MusicXML); a **real `/mary` response
  uploaded as a file** renders at 780×319 under "Preview" with
  "Uploaded: mary.musicxml"; XML that passes the page's checks and fails
  OSMD's parser shows **"Failed to render sheet music: given music sheet was
  incomplete or could not be loaded."** rather than a blank stave.
- `/dev/kit`: `zoom` 1 → 2.2 grows the drawn staff from 318px to 700px tall
  **without reloading** the score; `clear()` empties the SVG (3 children → 0,
  the OSMD shell stays, which is what `osmd.clear()` does and what React did)
  and a later `Load` repopulates it; broken XML sets both the status output
  and the `error` signal.
- Every console error across the whole run (8) was a deliberately triggered
  error path. Zero unexpected console or page errors.

---

## 9. Deviations

| #   | What the plan/packet/React said | What was done | Why |
| --- | -------------------------------- | -------------- | --- |
| 1   | Packet: "`SheetMusicComponent` … zoom input, isLoading/error signals" — one component | **Two**: `<app-sheet-music>` (the wrapper) and `<app-sheet-music-display>` (React's card chrome) | React had the same split (hook + component) and it is load-bearing: Phase 5's `QuestionBoard` and Phase 6's `GameBoard` draw their own chrome and cannot take the card. The packet's named API is all on `SheetMusicComponent`. |
| 2   | Packet: "Port the mapper test" | Written new | R5 — `frontend-react/src/services/api/mappers/` has no test file. |
| 3   | React's `SheetMusicPage` held music21 spellings in page code (`tonic: "B-"`) and posted them unconverted | The scale list holds UI spellings (`"Bb"`); `MusicService` converts | The invariant is "feature code never sees music21 `-` flats". React's own page violated it. The request body is byte-identical (`toMusic21NoteName("Bb") === "B-"`), so this is a code-location change, not a behaviour change. |
| 4   | React's `MusicService` also had `isValidNote` / `isValidRhythm` | Not ported | Dead code — `grep -rn "isValidNote\|isValidRhythm" frontend-react/src` matches only their own definitions. |
| 5   | Packet Inputs list `services/api/music.service.ts` (all 7 endpoints) | Only `/mary` and `/random` | The packet's Work section scopes it: "for the endpoints these pages use". The five game endpoints are Phases 5 and 6, and §5 above says how to add them. |
| 6   | React's axios `musicApiClient` was a separate module with an interceptor | Base URL, 10s timeout and error shaping live in `MusicService` | Angular's `HttpClient` is injected, not constructed per-service; a separate "client" object would be a second interceptor chain. Behaviour is unchanged, including the exact error strings. |
| 7   | React's `SheetMusicDisplay` was wrapped in `ComponentErrorBoundary` + `SheetMusicFallback` | Not ported; the error panel is driven by the `error` signal | Phase 2 handoff §5 settled this: Angular has no per-component boundary, and a feature that needs a contained failure state renders it from an explicit error signal. Which is what this is. |
| 8   | React drew into a hidden container and shipped `width="0"` staves | One-shot `ResizeObserver` redraw (§7 F1) | A blank stave is not "functional against the live music service" (the packet's exit criterion). React's behaviour is a race it loses about two times in three. |
| 9   | Nothing in the packet about Tailwind's `important` | `important: "html"` in `tailwind.config.js` (§7 F2) | Otherwise all 47 `<ng-icon>` call sites render at 1em and no screenshot in any later phase can pass. |
| 10  | Nothing about `styles.css` | `:root ng-icon { display: block; vertical-align: middle }` (§7 F3) | Extends Tailwind preflight's own `svg` rule to the element that replaced the svg. |
| 11  | React used `space-y-2` for the three button columns | `flex flex-col gap-2` | `display: contents` hosts take no margin; the columns were 32px short. Same 8px gap, same visual result. |
| 12  | React's file input had no accessible name | `aria-label="Select a MusicXML file"` on `/convert`'s input | Same class of change as Phase 0's nine accessible names: pixel-neutral, and a bare file input is otherwise unreachable by name. **Note it is a name the React app does not have**, so it is a (deliberate) divergence in the accessibility tree. |
| 13  | PLAN.md §4 puts mappers in `shared/utils/` and types in `shared/models/`; Phase 1 put both in `auth/models/` | Followed **PLAN.md**, not Phase 1's precedent | `MusicService` is consumed by three features (sheet-music, identification-game, note-game), so a feature-local home would mean cross-feature imports. Auth's are auth-only. |
| 14  | Packet is silent on the build's CommonJS warning | `allowedCommonJsDependencies: ["opensheetmusicdisplay"]` in `angular.json` | The documented remedy. Exit code was already 0; this keeps the build output clean so a real warning is visible. |
| 15  | Packet is silent on where zoom/clear get exercised by a human | Added a "Sheet music (OSMD)" section to `/dev/kit` | `loadAndRender`/`clear`/`zoom` are a method-and-input API no page exposes, so there was nowhere to see them. Uses a static one-note score held in the kit component, so the page's "nothing it shows touches the API" claim still holds. |
| 16  | Phase 2 handoff §10 warns `display: contents` hosts swallow `class` | It also records that they swallow **margins** | Discovered by deviation 11; written down so Phase 5/6 do not rediscover it. |

### Not ported, on purpose

- `SheetMusicFallback` / `ComponentErrorBoundary` — deviation 7.
- `features/note-game-display/` — Phase 6's packet lists it as its own input;
  §4 records what it needs from this component.
- `isValidNote` / `isValidRhythm` — deviation 4.

---

## 10. Environment notes for the next agent

- `npm ci` in `frontend/` was needed (a fresh worktree has no
  `node_modules`). npm 11 prints `allow-scripts` warnings for esbuild et al.;
  the build works anyway.
- `nvm` could not be sourced in this session's shell. Prepending
  `$HOME/.config/nvm/versions/node/v24.19.0/bin` to `PATH` is equivalent and
  needs no `.`-sourcing.
- `ng serve --port 4300` was used throughout; the Go service's
  `ALLOWED_ORIGINS` covers it. `frontend-react` was run on :5173 for the React
  comparisons — it needs its own `npm ci` first.
- Single spec file: `npx ng test --include=<path>` (STATE.md's note holds).
- **Two `whenStable()`s are not enough for an OSMD spec.** Change detection
  settles before OSMD's promise chain does — the effect only *starts*
  `loadAndRender`, and `load()` itself awaits. The display spec's `settle()`
  helper is `whenStable` → `setTimeout(0)` → `whenStable`.

---

## 11. Ledger line for `STATE.md`

Copy into row 4, replacing the `pending` cells. The range ends at this
handoff's own commit; the one commit after it does nothing but write this
hash down, as Phase 1's did.

```
| 4     | Sheet music / OSMD         | built   | 2026-08-20 | `64fb283..ce2ff23` | OSMD wrapper + card chrome, MusicService with the notation boundary, both pages, `/dev/kit` OSMD section. 146 tests in 21 files. 8/8 baseline screenshots pass; navigation.spec 21/21 unmodified on :4300. **Three inherited defects fixed, two of them global** -- React's zero-width staff race (F1), Tailwind utilities losing to Angular component hosts so all 47 `<ng-icon>`s rendered at 1em (F2, Phase 2's), and `<ng-icon>` missing preflight's `svg` rule (F3). 16 deviations below. |
```

Deviations to append to the deviations table (short forms; the full table is
§9 above):

```
| 4 | Packet: one `SheetMusicComponent` | Two -- `<app-sheet-music>` (wrapper) + `<app-sheet-music-display>` (React's card) | React had the same hook/component split, and Phases 5-6 draw their own chrome around the wrapper. |
| 4 | Packet: "port the mapper test" | Written new | R5 -- the React repo has no test for `music.mapper.ts`. |
| 4 | React's SheetMusicPage posted music21 spellings (`"B-"`) from page code | Page holds `"Bb"`; `MusicService` converts | The stated invariant is that feature code never sees `-` flats; React's own page broke it. Identical wire payload. |
| 4 | React's `MusicService` had `isValidNote`/`isValidRhythm` | Not ported | Dead code -- nothing calls them. |
| 4 | Packet Inputs list all 7 music endpoints | `/mary` and `/random` only | The Work section scopes it to "the endpoints these pages use"; Phases 5-6 add theirs. |
| 4 | React had a separate axios `musicApiClient` module | Base URL, 10s timeout and error shaping live in `MusicService` | `HttpClient` is injected, not constructed; error strings are unchanged. |
| 4 | React wrapped the display in `ComponentErrorBoundary` + `SheetMusicFallback` | Error panel driven by the `error` signal | Phase 2 handoff §5's replacement for boundaries, applied to the case it named. |
| 4 | React renders OSMD into a hidden container and ships `width="0"` staves | One-shot `ResizeObserver` redraws once the container has a width | Verified React loses this race 2 times in 3 on :5173. A blank stave fails the packet's exit criterion. |
| 4 | Nothing about Tailwind's `important` | `important: "html"` | Angular injects component styles after `styles.css` at class specificity, so `@ng-icons` beat every `h-N w-N`: all 47 icons rendered at 1em. Selector strategy, no `!important`. |
| 4 | Nothing about `styles.css` | `:root ng-icon { display: block; vertical-align: middle }` | `<ng-icon>` is a custom element, so preflight's `svg` rule never reached it -- 6px of stray line-box height and a 3px nav offset. |
| 4 | React used `space-y-2` for the rhythm/CTA columns | `flex flex-col gap-2` | `display: contents` hosts take no margin, so the columns stacked flush -- 32px short. |
| 4 | React's file input had no accessible name | `aria-label="Select a MusicXML file"` | Pixel-neutral; same class of change as Phase 0's nine names. Recorded because it is a name React does not have. |
| 4 | Phase 1 put mappers/types under the feature (`auth/models/`) | Followed PLAN.md §4: `shared/utils/`, `shared/models/`, `shared/services/` | `MusicService` serves three features; a feature-local home would mean cross-feature imports. |
| 4 | Packet silent on the CommonJS build warning | `allowedCommonJsDependencies: ["opensheetmusicdisplay"]` in `angular.json` | The documented remedy; keeps the build output clean. |
| 4 | Packet silent on exercising zoom/clear by hand | Added a "Sheet music (OSMD)" section to `/dev/kit` | No page exposes those; the section uses a static score so the kit still touches no API. |
| 4 | Phase 2 handoff §10: `display: contents` hosts swallow `class` | They swallow **margins** too | Recorded so Phases 5-6 do not rediscover it through a silent 32px layout shift. |
```

Deferred-decisions table: **no change**. Phase 4 decided nothing that was
deferred, and added no dependency.
