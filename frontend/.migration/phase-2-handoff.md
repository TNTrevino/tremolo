# Phase 2 handoff — Shared UI kit

Status: **built**. `npm run build`, `npm run lint`, `npm run test:run` and
`npm run format:check` all exit 0 (104 unit tests in 16 files, up from 27 in
8; **109 in 17** after the F1 fix). The kit was also driven in a real browser
— see §8.

**Read §11 before §6 or deviation 12.** The verifier's finding F1 showed the
logout claim in both was false; §11 is the correction and the fix.

---

## 1. What exists now

| Area                | Files (all under `frontend/src/app/`)                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `cn()`              | `shared/utils/cn.ts`                                                                                                     |
| Icon registry (D12) | `core/icons.ts`                                                                                                          |
| UI primitives       | `shared/components/ui/{button.component,card.directive,input.directive,label.directive,select.component,skeleton.directive,dialog.component}.ts` |
| Confirm dialog      | `core/components/confirm-dialog/confirm-dialog.component.ts`                                                             |
| Toast (D13)         | `core/components/toast/{toast-container,toast-item}.component.ts`                                                        |
| Spinner / error     | `core/components/{spinner/spinner,app-error/app-error}.component.ts`                                                     |
| Navigation          | `core/components/navigation/navigation.component.{ts,html}`                                                              |
| Global ErrorHandler | `core/services/global-error.handler.ts`                                                                                  |
| ThemeStore          | `core/services/theme.store.ts`                                                                                           |
| Friends UI store    | `features/friends/services/friends.store.ts`                                                                             |
| Form kit            | `shared/components/forms/{field-error,form-error.component,form-label.component,form-field.component,form-input.directive,form-select.directive}.ts` |
| zod schemas (D11)   | `shared/validators/auth.schemas.ts`                                                                                      |
| Small utilities     | `shared/services/{breakpoint,clipboard}.service.ts`                                                                      |
| RhythmGlyph         | `shared/components/music/rhythm-glyph.component.ts`                                                                      |
| Demo route          | `dev/kit-page/kit-page.component.{ts,html}` → `/dev/kit`                                                                 |

`app.component.html` is now the shell React's `AppContent` was:

```html
<div class="min-h-screen bg-background text-foreground">
	<app-navigation />
	<router-outlet />
	<app-toast-container />
</div>
```

The friends **panel** is still missing — React rendered it here whenever the
user was signed in. Phase 3 owns it; the store and the nav toggle that opens
it exist.

`app.config.ts` gained three providers: `provideIcons(TREMOLO_ICONS)`,
`{ provide: ErrorHandler, useClass: GlobalErrorHandler }`, and
`withRouterConfig(ROUTER_CONFIG)`, which is
`{ onSameUrlNavigation: "reload" }` (see §6 and §11, logout).

---

## 2. The Angular API of each primitive

This is the section Phase 3+ reads before composing anything. Where a name
differs from React, the React name is in the last column.

> **Corrected by Phase 3 sub-feature 1 — read
> `phase-3-subfeature-1-handoff.md` §7 before using this table.** Three
> rows here are wrong as written: the Card parts now take a `className`
> input merged through `cn()` (a plain `class` cannot override a base
> utility); `<ng-icon>` must be sized with its own `size` input, not with
> `h-*`/`w-*`; and `space-y-*` does nothing across a `display: contents`
> host, so containers holding kit components use `flex flex-col gap-*`.

### The shape rule

Three shapes, and which one a primitive got was decided by one question:
_does it need a template?_

- **Attribute directive** — React rendered a bare element whose only job was
  a class string. The host stays exactly the element React rendered: no
  wrapper in the DOM the screenshot baselines were captured from, `class="…"`
  from the caller still works (Angular merges static classes with a `[class]`
  binding), and a native `<input>` remains bindable by `[formField]`.
- **Component with `:host { display: contents }`** — it needs a template
  (content swap, extra elements). The host box disappears, so the real
  control, not a wrapper, is its parent's flex/grid item. **Consequence: a
  `class` written on such a host styles nothing** — pass `className` instead.
- **Component with a real host box** — only `app-select`, whose host _is_ the
  positioned wrapper React had around the select.

| Primitive       | Selector / usage                                        | Inputs (→ React)                                                                                                                                     |
| --------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button          | `<app-button>` (host `display: contents`)               | `variant`, `size` (unchanged CVA API), `className` (→ `className`), `loading`, `disabled`, `type` (**defaults `"button"`**, React defaulted to submit), `ariaLabel`, `ariaExpanded`, `ariaHasPopup`. `(click)` bubbles from the inner button, so `<app-button (click)="…">` works. `buttonVariants()` is exported. |
| Card            | `[appCard]` `[appCardHeader]` `[appCardTitle]` `[appCardDescription]` `[appCardContent]` `[appCardFooter]`; `CARD_DIRECTIVES` exports all six | none — put your own classes on the element                                                                                                            |
| Input           | `input[appInput]`, `textarea[appInput]`                 | `error` (message string, as in React). Adds `aria-invalid` when set (React did not).                                                                  |
| Label           | `label[appLabel]`                                       | none                                                                                                                                                  |
| Select          | `<app-select>` — host is the wrapper                    | `value` (**`model`**, so `[(value)]`), `disabled`, `selectId` (→ `id`; the host cannot take it), `ariaLabel`, `error` (**`model`**, so `appFormSelect` can push into it), `(touch)` output. Implements `FormValueControl<string>`, so `[formField]` binds it. `<option>`s are projected. |
| Skeleton        | `[appSkeleton]`                                         | none                                                                                                                                                  |
| Dialog          | `<app-dialog>` + `[appDialogContent]` `[appDialogHeader]` `[appDialogTitle]` `[appDialogFooter]`; `DIALOG_DIRECTIVES` exports all five | `open` (**`model`**, so `[(open)]` replaces `open` + `onOpenChange`). Escape and backdrop-click close it; body scroll locks while open. |
| ConfirmDialog   | `<app-confirm-dialog>`                                  | `open` (model), `title`, `description` (**strings**, were `ReactNode`), `confirmLabel`, `pending`, `(confirm)` output                                  |
| Toast container | `<app-toast-container>`                                 | none — reads `NotificationService.toasts`                                                                                                             |
| Spinner         | `<app-spinner>`                                         | `fullPage` (React's `PageLoader`), `label`                                                                                                            |
| Error           | `<app-error>`                                           | `error` (unknown → `getErrorMessage`), `fallback` (→ `errorFallback`)                                                                                 |
| RhythmGlyph     | `<app-rhythm-glyph>`                                    | `rhythm`, `rhythmType`, `className` (→ `className`). `describeRhythm()` still exported.                                                                |

### Form kit

| Component        | Selector                                 | Notes                                                                                                                         |
| ---------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| FormField        | `<app-form-field>`                       | `label`, `htmlFor`, `required`, `className`, plus **either** `error` (a string, wins) **or** `field` (a Signal Forms field it reads itself) |
| FormLabel        | `<app-form-label>`                       | `htmlFor`, `required` (renders the `*`). Emits a real `<label for>`, so `getByLabel()` still works.                             |
| FormError        | `<app-form-error>`                       | `message`; renders nothing when empty, as React's returned `null`                                                              |
| FormInput        | `input[appFormInput]`, `textarea[…]`     | no inputs — reads the field bound by `[formField]` on the same element                                                          |
| FormSelect       | `app-select[appFormSelect]`              | no inputs — same, and pushes the message into the select's `error`                                                              |

### Services

| Service              | Provided                        | Surface                                                                         |
| -------------------- | ------------------------------- | ------------------------------------------------------------------------------- |
| `ThemeStore`         | root                            | `theme` signal, `setTheme(t)`, `toggleTheme()`                                    |
| `FriendsUiStore`     | root                            | `isPanelOpen`, `searchQuery`, `togglePanel()`, `setSearchQuery(q)`                |
| `BreakpointService`  | root                            | `isMobile`, `isPhoneLandscape`, `isDesktop` — mutually exclusive, same 3 queries |
| `ClipboardService`   | **per component** (`providers:`) | `copied` signal, `copy(text)`. Not root: `copied` was per-hook state in React.   |

`useDebounce` has **no port**. PLAN.md §5.5 puts `debounceTime` at the
consumption site, so a shared helper would be a second way to do it.

---

## 3. The Signal Forms + zod wiring (copy this)

The whole pattern, as shipped on the login page
(`auth/components/login/login.component.ts`) and exercised on `/dev/kit`:

```ts
import { form, FormField, validateStandardSchema } from "@angular/forms/signals";
import { loginSchema, type LoginFormData } from "@shared/validators/auth.schemas";

@Component({
	imports: [FormField, FormFieldComponent, FormInputDirective, ButtonComponent],
	// …
})
export class LoginPageComponent {
	private readonly model = signal<LoginFormData>({ email: "", password: "" });

	readonly loginForm = form(this.model, (path) => {
		validateStandardSchema(path, loginSchema);
	});

	submit(event: Event): void {
		event.preventDefault();
		this.loginForm().markAsTouched(); // reveals every message at once
		if (this.loginForm().invalid()) return;

		this.auth.login(this.model()).subscribe({ /* … */ });
	}
}
```

```html
<form (submit)="submit($event)">
	<app-form-field
		label="Email Address"
		htmlFor="email"
		[required]="true"
		[field]="loginForm.email"
	>
		<input appFormInput id="email" type="email" [formField]="loginForm.email" />
	</app-form-field>

	<app-button type="submit" variant="brass" [loading]="pending()">Sign In</app-button>
</form>
```

Five things worth knowing before you copy it:

1. **The directive is `[formField]`**, not `[control]` or `[field]`. Import
   the `FormField` class from `@angular/forms/signals`.
2. **`form()` must be called in an injection context** — a field initializer
   is one.
3. **Errors stay hidden until the field is `touched()`.** That reproduces
   React Hook Form's default `mode: "onSubmit"`. `markAsTouched()` on the
   root marks every descendant (`skipDescendants` opts out), so a submit
   press reveals the lot.
4. **`(submit)` + `preventDefault()`, not `(ngSubmit)`.** Signal Forms brings
   no `NgForm`, so there is still nothing publishing `ngSubmit`; without the
   `preventDefault()` the browser does a GET with the password in the URL.
   This is the idiom, not the Phase 1 workaround.
5. **Cross-field rules work.** `signupSchema`'s `.refine(...)` lands on
   `confirmPassword`, because `validateStandardSchema` maps each issue's path
   onto the matching field. `/dev/kit` demonstrates it.

`submit()` from `@angular/forms/signals` is deliberately **not** used: it is
Promise-based, and D5 says services hand back Observables. Validate, then
`subscribe`.

---

## 4. Registered icons (D12)

`core/icons.ts` registers **47** icons — the exact set imported from
`lucide-react` across the React app's 33 consumers, collected by grepping
import specifiers:

```
AlertCircle  AlertTriangle  ArrowLeft  Award  Book  Brain  Calendar  Check
CheckCircle2  ChevronDown  ChevronUp  Clock  Copy  Download  Eye  EyeOff
Home  Info  Key  Keyboard  LayoutDashboard  Loader2  LogOut  Mail  Menu
Moon  Music  Music2  Plus  RefreshCw  RotateCcw  School  Search  Settings
Shield  Sun  Target  Trash2  TrendingUp  Trophy  Upload  User  UserCircle
UserMinus  UserPlus  Users  X
```

Each is the `lucide`-prefixed export of the same name (`Sun` → `lucideSun`).
Usage: import `NgIcon`, then `<ng-icon name="lucideSun" class="h-5 w-5" />`.

**Always pass `aria-hidden="true"` on a decorative icon.** `<ng-icon>` puts
`role="img"` on its host, where lucide-react's SVGs carried no role at all;
without it, icons start appearing in the accessibility tree and the parity
suite's `getByRole("button", { name })` selectors change meaning.

To add an icon: add it to `TREMOLO_ICONS`. Nothing else.

---

## 5. Error-handling granularity (the decision the packet requires)

**Decision: one global `ErrorHandler` that logs and toasts. No fallback UI,
no isolated subtrees. Accepted as coarser than React's three tiers.**

React had `ErrorBoundary` at the root, a second one inside the shell around
the routed page, and `ComponentErrorBoundary` + `fallbacks/`
(`SheetMusicFallback`, `GameBoardFallback`) around individual widgets.
Angular has no equivalent: a component cannot catch a descendant's render
error. So:

- **Caught:** anything reaching Angular's `ErrorHandler` — exceptions in
  lifecycle hooks, template expressions and event handlers, plus unhandled
  rejections and window errors via the `provideBrowserGlobalErrorListeners()`
  Phase 0 already installed.
- **Seen:** an error toast titled **"Something went wrong"** (React's boundary
  heading, so the user-facing copy is unchanged), over the page they were
  already on. Nothing is replaced; a component that throws mid-render leaves
  whatever it had already rendered.
- **Lost:** the per-widget retry affordances and the full-page "Try Again /
  Reload / Go Home" card. `ErrorBoundary.tsx`, `ComponentErrorBoundary.tsx`
  and `fallbacks/` are **not ported**.
- **Replacement for the cases that mattered:** a feature that needs a
  contained failure state owns it locally — an `@if (resource.error())` arm
  rendering `<app-error />`, which is the PLAN.md §5.2 pattern every
  data-loading page already uses. Phase 4 (OSMD) and Phase 5 (game board) are
  the two that had bespoke fallbacks; both should render `<app-error />` (or
  their own card) from an explicit error signal rather than expect a boundary
  to catch a throw.

`navigation.spec.ts` asserts `/something went wrong|unexpected error/i` has
**count 0** on every route — verified still true on all 19 paths (§8), because
nothing renders until something actually throws.

---

## 6. Behaviour notes for Phase 3+

- **Logout re-runs guards.** ~~`AuthService.logout()` clears the session;
  `NavigationComponent` then does `router.navigateByUrl(router.url)`, and
  `onSameUrlNavigation: "reload"` (app.config.ts) makes the guards run again.
  That reproduces React exactly: a guarded page bounces to `/login`, a public
  page stays put. No E2E spec covers logout, so this was a judgement call —
  recorded as a deviation.~~ **Wrong as shipped — the verifier's finding F1.**
  `onSameUrlNavigation: "reload"` does not make the guards run again on its
  own, so the guarded page kept rendering to a signed-out visitor. Fixed in
  §11; read that instead.
- **Theme.** Key `tremolo-theme`, Zustand's envelope
  `{"state":{"theme":"dark"},"version":0}`, default `dark`, class swapped on
  `documentElement`. `AppComponent` injects `ThemeStore` purely so the class
  is applied at bootstrap.
- **Menus must be `@if`-ed, never CSS-hidden.** `auth.spec.ts` asserts the
  signed-in user's full name is *visible* after login; the closed account
  dropdown holds that same name, and a CSS-hidden copy would be matched first
  by `getByText(...).first()`.
- **The accessible names are acceptance criteria**, unchanged from Phase 0's
  list and now covered by `navigation.component.spec.ts`. Still owed by Phase
  3's friends panel: `Add friend`, `Back to friends`, `Add <name>` /
  `<name> added`.
- **`shareReplay` is still unique to the refresh interceptor** (D6). Nothing
  in this phase caches, dedupes or replays.
- **No `ngOnDestroy` unsubscribe code anywhere** (§5.6). The two timers in
  `toast-item.component.ts` and the one in `clipboard.service.ts` are
  `timer()` piped through `takeUntilDestroyed(destroyRef)`; the nav bar's
  current-path stream is `toSignal`.

---

## 7. R6 dependency checks

Run with `npm view <pkg> peerDependencies` on 2026-08-20.

| Package                | Version | `@angular/core` peer | Verdict                                                                                                                                                              |
| ---------------------- | ------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@ng-icons/core`       | 35.0.1  | `>=22.0.0`           | **Adopted.** Also peers `@angular/common >=22.0.0`, `rxjs ^6.5.3 \|\| ^7.4.0`, and `@angular-devkit/schematics` / `@schematics/angular` `>=22.0.0` (both come with `@angular/cli@22.1.3`). |
| `@ng-icons/lucide`     | 35.0.1  | **none declared**    | **Adopted, with the caveat recorded.** It declares no `peerDependencies` at all — it is icon *data* (`dependencies: { tslib }`, `sideEffects: false`) with no Angular API surface; its sibling `@ng-icons/core` carries the Angular 22 peer. Verified by building and by running it in a browser. |

No other dependency was added. `npm install` reported 0 vulnerabilities and
no unmet peers.

Rejected earlier and still rejected: `lucide-angular` (peers 13–21) and
`ngx-toastr` (peers ^21) — both capped below Angular 22, which is why D12 and
D13 exist.

---

## 8. Verification actually run

```
npm run build        exit 0
npm run lint         exit 0   (--max-warnings 0)
npm run test:run     exit 0   104 tests, 16 files
npm run format:check exit 0
```

Tests the packet required, and where they live:

| Requirement                                  | Spec                                                       |
| -------------------------------------------- | ---------------------------------------------------------- |
| Button variants                              | `shared/components/ui/button.component.spec.ts` (22 tests)  |
| Dialog open / close / escape                 | `shared/components/ui/dialog.component.spec.ts`             |
| Select keyboard nav                          | `shared/components/ui/select.component.spec.ts` — see below |
| Toast show / dismiss                         | `core/components/toast/toast-container.component.spec.ts`   |
| Form field error driven by a zod schema      | `shared/components/forms/form-field.component.spec.ts`      |
| RhythmGlyph rendering (port)                 | `shared/components/music/rhythm-glyph.component.spec.ts`    |

Two more beyond the list: `core/services/theme.store.spec.ts` (persistence,
rehydrate, class swap) and `core/components/navigation/navigation.component.spec.ts`
(port of `Navigation.test.tsx` plus every accessible name).

**Browser check** (dev server on :4321, ad-hoc Playwright script, not
committed — the parity suite is the committed instrument):

- all 19 reachable paths render with the navigation landmark and **zero**
  console or page errors; the five guarded ones still redirect to `/login`;
  `/` still lands on `/note-game`
- theme toggles light↔dark, writes `{"state":{"theme":"light"},"version":0}`,
  and survives a reload
- dialog opens, closes on Escape; toast appears and self-dismisses at 5s
- zod round trip: bad email → "Invalid email format" on blur → clears on fix;
  Validate reveals all three messages; filling valid values clears them and
  `Form valid: true`
- login: heading, both labels and the exact "Sign In" button all present;
  empty submit shows two client-side messages and stays on `/login`
- mobile viewport: `Open menu` → `Close menu`, mobile links mount

Screenshots of `/dev/kit` in both themes and of the restyled login page were
eyeballed against DESIGN.md: ink navy does the everyday work, brass appears
once per screen (the login CTA, the one "brass" swatch), `--accent` only as a
hover wash, cards carry the single soft shadow and buttons none.

**The Playwright parity suite was not run.** It is not in this packet's
Verify and still cannot pass end to end: 18 pages are placeholders. The
verifier is better placed to run `navigation.spec.ts` and the theme half of
`friends-and-theme.spec.ts`, which are the two slices this phase actually
delivers — both need the Go service on :5001 for their fixtures.

---

## 9. Deviations

| #   | What the plan/packet said                                                        | What was done                                                                                          | Why                                                                                                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Packet Inputs: "**Read `frontend-react/DESIGN.md` first**"                        | It is at **`frontend/DESIGN.md`**; that is the copy that was read                                       | R5, repo wins. Phase 0 moved the React app but left `DESIGN.md` in `frontend/`. Its content is unchanged and it is still the source of truth.                                                                                                  |
| 2   | Packet: "`shared/components/ui/` — … **(10 files** …)" and "**10 primitives**"    | The folder holds **9** primitives plus `button.test.tsx`; 9 were ported                                 | R5. The packet's own list names nine (button, card, confirm-dialog, dialog, input, label, select, skeleton, toast); the tenth file is the test. Nine primitives + `app-spinner` + `app-error` are what `/dev/kit` renders.                     |
| 3   | Packet lists confirm-dialog and toast among `shared/components/ui/`               | Both live in `core/components/` (`confirm-dialog/`, `toast/`)                                           | R5. PLAN.md §4 puts them there and Phase 1 left the `.gitkeep` folders waiting. Same for navigation, spinner and app-error.                                                                                                                    |
| 4   | PLAN.md §4 has no folder for a demo route                                        | Added `src/app/dev/kit-page/`                                                                           | The packet requires `/dev/kit` and demands it be trivially removable; a top-level `dev/` says "not the product" better than hiding it under a feature.                                                                                          |
| 5   | Packet: "Form components … Prove the pattern with the login/**signup** schemas"   | Login is rebuilt on Signal Forms; **signup stays a Phase 1 placeholder**, and its schema is exercised on `/dev/kit` | PLAN.md §1 makes auth screens Phase 3's pattern-setter. Building the signup page here would take that work out of the phase that is scoped for it. The schema, the cross-field `.refine` and the select binding are all proven on the kit page. |
| 6   | Phase 1 handoff: "Phase 2 … should delete the [`(ngSubmit)`] workaround"          | The native `(submit)` + `preventDefault()` **stays**                                                    | It was never a workaround. Signal Forms brings no `NgForm`, so nothing publishes `ngSubmit`; native submit is the documented idiom. The comment explaining it was rewritten.                                                                    |
| 7   | React's `<Button>` inside a form defaulted to `type="submit"`                      | `<app-button>` defaults to `type="button"`                                                              | Explicit beats implicit for the one behaviour that silently posts a form. Every call site that wants a submit says so.                                                                                                                          |
| 8   | React portaled the dialog into `document.body`                                    | It renders in place, `fixed inset-0 z-50`, host `display: contents`                                     | A portal needs `@angular/cdk`, a dependency this packet does not authorise and R6 would have to clear. No ancestor in the app creates a containing block for `fixed`, so the overlay still covers the viewport.                                 |
| 9   | React's `ConfirmDialog` took `ReactNode` for `title`/`description`                | Strings                                                                                                 | Nothing passed markup, and turning component-shaped data back into plain data is the same move D9 makes for `GameDefinition`.                                                                                                                   |
| 10  | Packet: component test for "select **keyboard nav**"                              | The spec pins the contract that *earns* native keyboard nav, not the key handling                       | The control is a native `<select>`; arrow keys, type-ahead and Home/End are the browser's, and **jsdom implements none of them**. The spec asserts it really is a `<select>`, is focusable, carries its label's `for` id, and round-trips a selection. The real keyboard path is Playwright's `selectOption`. |
| 11  | Packet: port `stores/theme.store.ts`; friends store is not mentioned              | `FriendsUiStore` was ported too                                                                         | The nav bar's friends toggle needs `isPanelOpen`/`togglePanel`, and `friends-and-theme.spec.ts` asserts the toggle is hidden from anonymous visitors. Only the UI half was ported; nothing here touches the API.                                |
| 12  | Nothing in the packet about logout navigation                                     | Re-navigate the current URL after logout, with `onSameUrlNavigation: "reload"` **and** `runGuardsAndResolvers: "always"` on the seven signed-in-only routes | Angular guards do not re-run when a store changes. **Corrected after verifier finding F1:** the first two pieces alone left the signed-out visitor on `/dashboard`, because the default `runGuardsAndResolvers` (`"paramsOrQueryParamsChange"`) never fires on a same-URL navigation. All three together reproduce React's behaviour on both guarded and public pages; `app.routes.spec.ts` covers it. See §11. |
| 13  | Phase 1 deviation 8: `NG_CLI_ANALYTICS=false` "stops it recurring"                | It did **not**. Fixed properly with `npx ng analytics disable --global`                                 | The CLI rewrote `angular.json` with an unformatted `"analytics": false` again even with the env var exported. The global setting lives in `~/.angular-config.json`, outside the repo, and `ng build`/`lint`/`test` now leave `angular.json` untouched. |
| 14  | Phase 1 deviation 7 / `src/testing/auth-fixtures.ts` header                       | The header now says the split is a convention, not a barrier                                            | The Phase 1 verifier disproved the original claim by importing the fixture from `auth.store.ts` and building clean. Left uncorrected, a later phase would trust a guard rail that is not enforcing anything.                                     |
| 15  | React's inputs/selects had no `aria-invalid`                                       | `appInput`, `appFormInput` and `app-select` set it when they carry an error                             | Pixel-neutral, and it is the attribute that tells a screen reader what the red border says. Same class of change as Phase 0's accessible names.                                                                                                 |

### Not ported, on purpose

- `QueryState.tsx` — the packet says delete it; its job is PLAN.md §5.2's
  template block, and `<app-spinner>` / `<app-error>` are its two arms.
- `ErrorBoundary.tsx`, `ComponentErrorBoundary.tsx`, `fallbacks/` — see §5.
- `ErrorTester.tsx` — a dev-only harness for the boundaries that no longer
  exist.
- `useDebounce.ts` — `debounceTime` at the consumption site (PLAN.md §5.5).

---

## 10. Gotchas worth carrying forward

- **`vi.useFakeTimers()` breaks a zoneless component test.** It freezes the
  scheduler change detection runs on, so `fixture.whenStable()` never
  resolves and the whole file times out at 10s per hook. Use short real
  durations instead — `toast-container.component.spec.ts` is the worked
  example.
- **`display: contents` hosts swallow `class`.** Anything on `<app-button>`,
  `<app-form-field>`, `<app-form-label>`, `<app-form-error>`,
  `<app-rhythm-glyph>` or `<app-dialog>` must go through `className`, not
  `class`.
- **`<ng-content>` inside `@if`/`@else` compiles fine** on Angular 22 — that
  is what lets the button swap its content for the spinner.
- **`TestBed.tick()`** flushes effects in a zoneless service test (the theme
  store spec uses it); `fixture.whenStable()` is the component equivalent.
- ~~The dev server refuses `:4200` on this machine — something else already
  holds it. `npm run dev -- --port 4321` works; note that
  `E2E_BASE_URL` then has to match.~~ **Not a standing fact.** `:4200` was
  busy during this phase's build session only; the verifier found it free and
  ran the parity suite on it, and so did the F1 fix session. Check the port
  before assuming either way — `npm run dev -- --port <n>` works if it is
  taken, and `E2E_BASE_URL` then has to match.

---

## 11. Fix addendum — verifier findings F1 and F2 (2026-08-20)

The phase was held at `built` on one blocking finding. This section is the
correction; where it disagrees with §6 or deviation 12 above, this section
wins. Nothing outside the findings was touched.

### F1 — logging out on a guarded page now bounces to `/login`

**What was wrong.** §6 and deviation 12 claimed
`withRouterConfig({ onSameUrlNavigation: "reload" })` plus
`router.navigateByUrl(router.url)` re-ran the guards. It does not.
`onSameUrlNavigation: "reload"` only decides whether a navigation to the URL
you are already on is *processed* instead of dropped; whether that processed
navigation re-runs `canActivate` is `runGuardsAndResolvers`, which defaults to
`"paramsOrQueryParamsChange"` — and a same-URL navigation changes neither.
So the session cleared, the nav bar flipped to signed-out chrome, and the
visitor stayed on `/dashboard` reading a guarded page.

**The fix.** `runGuardsAndResolvers: "always"` on the seven signed-in-only
routes (`dashboard`, `profile`, `account`, `assignments`,
`assignments/:id/play`, `classes`, `classes/:id`). This is the verifier's own
diagnostic, promoted to the fix: it keeps the guards as the single source of
truth for who may see a route, rather than teaching the logout button a second
list of which URLs are guarded.

The guest-only routes (`login`, `signup`) deliberately do not carry it —
nothing re-navigates them in place, and signing in navigates away explicitly.

Two supporting changes, both in service of the fix:

- `app.config.ts` now exports `ROUTER_CONFIG` (`{ onSameUrlNavigation:
  "reload" }`) so the spec drives the app's real router configuration instead
  of a copy that could drift from it.
- The three comments that repeated the false claim — in `app.config.ts`,
  `app.routes.ts` and `NavigationComponent.logout()` — now say what actually
  happens and name the other half.

`NavigationComponent.logout()` itself is unchanged: clear the session, close
the menus, re-navigate `router.url`.

### The test, and the proof it guards the fix

`src/app/app.routes.spec.ts` (new, 5 tests). It builds a shell of
`<app-navigation> + <router-outlet>` over the **real** `routes` and the
**real** `ROUTER_CONFIG`, with only the lazy `loadComponent`s swapped for a
blank component — guards and route flags are the shipped ones. Each test signs
in, navigates, opens the account menu and presses **Log Out**, exactly as a
user does:

| Test | Asserts |
| ---- | ------- |
| guarded page | `/dashboard` → `/login`, session cleared |
| teacher page | `/classes` as a TEACHER → `/login` |
| redirect memory | `/assignments` is what `AuthStore.redirectUrl` holds afterwards |
| public page | `/about` → still `/about` (the half that already worked) |
| route table | every route guarded by `authGuard`/`teacherGuard` carries `runGuardsAndResolvers: "always"` — seven of them, so a new guarded route added in Phase 3+ cannot quietly miss it |

**Mutation proof, run twice.** With the fix in place: 109 tests in 17 files,
all green.

1. Deleted the seven `runGuardsAndResolvers: "always"` lines and re-ran
   `npm run test:run`: **4 of the 5 fail** — the three logout-bounce tests
   report `expected '/dashboard' to be '/login'` (and `redirectUrl` `null`),
   and the route-table test reports `expected 'dashboard: undefined' to be
   'dashboard: always'`. The public-page test still passes, which is correct:
   that behaviour never depended on the fix. Restored.
2. Flipped `ROUTER_CONFIG` to `onSameUrlNavigation: "ignore"` and re-ran:
   **3 fail** — the same three bounce tests. So the spec pins *both* halves of
   the mechanism, not just the new one. Restored.

`git diff` was empty after each restore before the fix was re-applied.

### Browser verification (the fix, not the test)

Chromium against the Go service on `:5001`, `ng serve` on `:4200`, a freshly
registered student:

- sign in → `/dashboard`; account menu → **Log Out** → URL is **`/login`**,
  `tremolo-auth` is `{"user":null,"token":null,"isAuthenticated":false}`
- sign in again, go to `/about`, log out → URL is **still `/about`**, nav bar
  shows the Login link
- zero console or page errors across both flows

### F2 — the miscount

§8 said `button.component.spec.ts` runs 16 tests. It runs **22**. Corrected in
place. The suite total the phase reported (104 in 16 files) was exact; it is
now **109 in 17 files** with this spec added.

### Checks re-run after the fix

```
npm run build        exit 0
npm run lint         exit 0   (--max-warnings 0)
npm run test:run     exit 0   109 tests, 17 files
npm run format:check exit 0
```

`e2e/` was not edited — the parity suite is read-only to this fix, and the
vitest harness above is the committed instrument for the logout behaviour.
