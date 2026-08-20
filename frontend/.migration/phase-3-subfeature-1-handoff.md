# Phase 3, sub-feature 1 handoff — auth screens (the pattern-setter)

Status: **built**. `npm run build`, `npm run lint`, `npm run test:run` and
`npm run format:check` all exit 0 (**146 unit tests in 21 files**, up from
109 in 17). Driven against the live Go service on `:5001` and diffed
against `.migration/baselines/`.

**Sub-features 2–6 read §2 and §7.** §2 is the shape every later slice
copies; §7 is three kit-level defects this slice found by pixel-diffing and
fixed — if you skip it you will re-discover them.

---

## 1. What exists now

| Area                 | Files (all under `frontend/src/app/`)                                        |
| -------------------- | ---------------------------------------------------------------------------- |
| One-shot notices     | `auth/services/auth.store.ts` (`setNotice` / `takeNotice`)                    |
| Google OAuth         | `auth/services/google-oauth.service.ts` (+ spec)                              |
| Google button        | `auth/components/google-sign-in-button/google-sign-in-button.component.ts`    |
| Login                | `auth/components/login/login.component.{ts,html}` (+ spec)                    |
| Signup               | `auth/components/signup/signup-page.component.{ts,html}` (+ spec)             |
| Google callback      | `auth/components/google-callback/google-callback-page.component.{ts,html}` (+ spec) |
| `PasswordRequirement`| `auth/models/auth.models.ts`                                                  |
| Kit fixes (§7)       | `shared/components/ui/card.directive.ts`, `src/styles.css`, `core/components/navigation/navigation.component.html` |

`AuthService` needed **no new methods**. `register()`, `googleCallback()`
and `linkGoogle()` were all already there from Phase 1 and are all already
Observable-returning (D5). The only auth-layer addition is the notice pair
on `AuthStore`.

---

## 2. The canonical pattern — copy these shapes

### 2.1 File layout

```
features/<feature>/                 (or auth/, public/ — PLAN.md §4)
├── components/<page-name>/
│   ├── <page-name>.component.ts        page: inject services, hold signals
│   ├── <page-name>.component.html      templateUrl, always a separate file
│   └── <page-name>.component.spec.ts   next to the component
├── services/<name>.service.ts          Observable in, Observable out (D5)
│   └── <name>.service.spec.ts
└── models/<name>.models.ts             DTO (snake_case) + domain (camelCase)
```

Naming: selector `app-<page-name>`, class `<PageName>Component`, one page
per folder, spec next to its subject. Imports inside `src/app/` are
**relative** (`../../services/auth.service`), matching every Phase 1–2 file;
the `@core/ @shared/ @features/` aliases exist but nothing uses them yet, so
do not start.

### 2.2 A page with a form (login, signup)

```ts
@Component({
	selector: "app-signup-page",
	imports: [/* only what the template uses */],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./signup-page.component.html",
})
export class SignupPageComponent {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);

	private readonly model = signal<SignupFormData>({ /* every field, no undefined */ });

	readonly signupForm = form(this.model, (path) => {
		validateStandardSchema(path, signupSchema);
	});

	readonly pending = signal(false);
	readonly errorMessage = signal<string | null>(null);

	submit(event: Event): void {
		event.preventDefault();
		if (this.pending()) return;

		this.signupForm().markAsTouched();     // reveal every message at once
		if (this.signupForm().invalid()) return;

		this.pending.set(true);
		this.errorMessage.set(null);

		this.auth.register(toRequest(this.model())).subscribe({
			next: () => { /* navigate */ },
			error: (err: unknown) => {
				this.pending.set(false);
				this.errorMessage.set(getErrorMessage(err));
			},
		});
	}
}
```

Five rules that come out of this, all load-bearing:

1. **`(submit)` + `preventDefault()`**, never `(ngSubmit)` — Signal Forms
   brings no `NgForm`. Phase 2 §3 already said this; it is still true.
2. **The model signal must be fully populated.** `form()` types every field
   off the initial value; a missing key is a `possibly undefined` field.
3. **`markAsTouched()` then `invalid()`, then subscribe.** Do not use
   `submit()` from `@angular/forms/signals` — it is Promise-based and D5
   says Observables.
4. **`pending` guards re-entry** (`if (this.pending()) return`) and drives
   `<app-button [loading]>`. It is only reset on the error arm: the success
   arm navigates away.
5. **Server errors go in a separate `errorMessage` signal**, rendered as a
   `role="alert"` banner above the fields. Field errors come from the schema
   through `<app-form-field [field]="...">`; nothing threads an `error`
   string by hand.

Template shape:

```html
<form (submit)="submit($event)">
	<div appCardContent className="flex flex-col gap-4">
		@if (errorMessage(); as message) {
			<p role="alert" class="…border-destructive…">{{ message }}</p>
		}
		<app-form-field label="Email Address" htmlFor="email" [field]="signupForm.email">
			<input appFormInput id="email" type="email" [formField]="signupForm.email" />
		</app-form-field>
		<app-form-field label="I am a..." htmlFor="role" [field]="signupForm.role">
			<app-select appFormSelect selectId="role" [formField]="signupForm.role">
				<option value="STUDENT">Student</option>
			</app-select>
		</app-form-field>
	</div>
</form>
```

### 2.3 A page that displays a fetch (rxResource) — **not demonstrated here**

Sub-feature 1 does not exercise `rxResource`, and that is not an oversight:
login, signup and the token exchange are all **mutations**, and the Google
callback page displays nothing from its fetch — every branch navigates
away. Inventing a resource to tick the box would have been cargo cult.

**PLAN.md §5.2 stays the canonical form** and sub-feature 3 (account /
profile) is the first honest consumer. What sub-feature 1 does pin is the
rule for the other half: **a one-shot action is a plain `.subscribe()` in
the handler** (PLAN.md §5.6). No `rxResource` for a POST, no stored
`Subscription`, no `takeUntilDestroyed` on an `HttpClient` call — it
completes after one emission.

### 2.4 Test shape

One spec per component, `TestBed` + `HttpTestingController`, driven through
the DOM the way the E2E suite drives it — labels, roles, button text — never
through component internals:

```ts
TestBed.configureTestingModule({
	providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
	            provideIcons(TREMOLO_ICONS)],
});
navigate = vi.spyOn(TestBed.inject(Router), "navigateByUrl").mockResolvedValue(true);
fixture = TestBed.createComponent(PageComponent);
await fixture.whenStable();
```

- `afterEach`: `backend.verify()` **and** `vi.restoreAllMocks()`.
- Type the router spy as `MockInstance` (`import type { MockInstance } from "vitest"`).
  `vi` itself is global here; do not import it.
- Drive inputs with `el.value = …; el.dispatchEvent(new Event("input")); await fixture.whenStable();`
  and forms with `new Event("submit", { cancelable: true })`.
- **Assert the parity suite's own selectors** — the exact heading text, the
  exact label list with its `for` targets, the exact button label. Those are
  the contracts a restyle can silently break, and a unit test fails in two
  seconds where the E2E run fails in two minutes.
- Every spec covers: renders the contract · client-side validation blocks
  the request · the happy path sends the right body and navigates · the
  server's error message is shown and the user stays put.

Run one file with `npx ng test --include=<path>`. **`npx vitest run <file>`
does not work here** (STATE.md's Phase 2 note — the vitest config belongs to
the `@angular/build:unit-test` builder).

### 2.5 Cross-page messages

React used react-router location state for three messages. Angular's router
has no equivalent that survives `navigateByUrl`, so they ride on
`AuthStore`, exactly as Phase 1's `redirectUrl` does:

```ts
this.store.setNotice("success", "Account created! Please log in.");
void this.router.navigateByUrl("/login");
```

```ts
// the landing page, read once at construction
readonly notice = signal(this.store.takeNotice());
```

`takeNotice()` reads and clears — one shot, because location state did not
survive the next navigation either. It is deliberately **not** persisted to
`localStorage` (a spec pins that).

**Sub-feature 6 owes one of these:** the Google callback sets
`setNotice("info", "Your Google account has been linked to your existing
account.")` before navigating to `/dashboard`, and React's `DashboardPage`
rendered it as `bg-primary/10 border-2 border-primary`. The dashboard page
must call `takeNotice()` and render it, or the message is silently dropped.

---

## 3. What each page does

### Login (`/login`)

Full React parity: music-glyph header, one-shot notice banner, server-error
banner, both fields, password reveal toggle, brass CTA, "Or continue with"
divider, Google button, "Don't have an account? Sign up".

Contracts the parity suite selects on, unchanged: heading **"Welcome to
Tremolo"**, labels **"Email Address"** and **"Password"**, button
**"Sign In"** (`exact: true`), redirect `AuthStore.redirectUrl() ?? "/dashboard"`
then cleared.

### Signup (`/signup`)

Full Signal Forms + zod. Two-column first/last name, email, password with
live requirement checklist and strength meter, confirm password, role
select, brass CTA, divider, "Sign up with Google", "Already have an account?
Login". Registration does **not** sign the account in: it sets the success
notice and navigates to `/login`, which is what `auth.spec.ts` asserts.

The checklist and meter are `computed()`s over the model, ported rule for
rule from React's `passwordRequirements` / `getPasswordStrength()`.

### Google callback (`/auth/google/callback`)

Reads `?code`/`?state`/`?error` off `ActivatedRoute.snapshot.queryParamMap`
in the constructor. Four failure paths (`access_denied`, any other `error`,
missing params, state mismatch) each set an error notice and `replaceUrl` to
`/login`; success stores the session and goes to `/dashboard`, adding the
info notice when `account_linked`.

React needed a `useRef` guard because StrictMode double-invokes effects. An
Angular component is constructed once, so **that guard has no port** — don't
add one.

The `google-callback` **screenshot baseline is the login page** carrying
"OAuth callback missing required parameters.", because the baseline visits
the route with no query string. That is the redirect working, and it is now
reproduced exactly.

---

## 4. Two accessibility notes that are acceptance criteria

- **The password reveal buttons carry no `aria-label`, on purpose.**
  `page.getByLabel("Password")` in `e2e/support/app.ts` is a *substring*
  match, so a name like "Show password" would match the field **and** the
  button and trip Playwright's strict mode on every login in the suite.
  React leaves them unnamed for the same reason. Both component specs assert
  that no control on the page has a name containing "password"; if you
  "improve" this, the whole suite fails. A name that avoids the word would
  be fine — nobody has proposed one worth the churn.
- **Every `<ng-icon>` here is `aria-hidden="true"`** (Phase 2 §4). `<ng-icon>`
  puts `role="img"` on its host, so a decorative icon without it changes what
  `getByRole("button", { name })` matches.

---

## 5. Deviations

| #   | What the plan/packet said                                                   | What was done                                                                                     | Why                                                                                                                                                                                     |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Packet: this slice proves "service + Signal Forms + **rxResource**"          | No `rxResource`. Service + Signal Forms + one-shot `.subscribe()`                                  | All three auth screens are mutations and none displays a fetch result; the callback navigates on every branch. PLAN.md §5.2 stays canonical and sub-feature 3 is its first honest consumer. See §2.3. |
| 2   | Packet Inputs list `services/api/auth.service.ts` as work                     | `AuthService` needed no change                                                                     | R5. Phase 1 already ported `register`, `googleCallback` and `linkGoogle`, all Observable-returning.                                                                                        |
| 3   | React carried three messages in react-router location state                  | `AuthStore.setNotice()` / `takeNotice()`                                                           | Same move Phase 1 made for `redirectUrl`, for the same reason: Angular's router has no state that survives `navigateByUrl`, and a query param would change the landing URL the suite asserts. |
| 4   | D5: "data services return `Observable<T>`"                                   | `GoogleOAuthService` returns plain values                                                          | It touches `crypto`, `sessionStorage` and `window.location` and never makes a request. There is nothing to cancel, retry or pipe. It is a service so a test can replace it.                 |
| 5   | React derived the strength label's colour with `color.replace("bg-","text-")` | Both class names are literals                                                                       | A runtime-built class is invisible to Tailwind's scanner, so `text-orange-500` / `text-yellow-500` never existed in the React stylesheet. No baseline captures the panel, so this is a fix, not a diff. |
| 6   | Phase 2 shipped `[required]="true"` on the login fields                       | Dropped on both auth pages                                                                          | React passes no `required`, so the baselines have no asterisk — and `getByLabel("Password", { exact: true })` in the signup spec would not match "Password *".                             |
| 7   | Phase 2 handoff §2: Card parts take "none — put your own classes on the element" | The six card directives take a `className` input merged through `cn()`                          | See §7.1. Without it a caller cannot override a base utility, and which one wins is alphabetical accident.                                                                                  |
| 8   | Phase 2 handoff §4: size an icon with `class="h-5 w-5"`                       | Size it with `<ng-icon size="1.25rem">`; a global rule makes the host `display: block`              | See §7.2. `h-*`/`w-*` cannot beat an inline style, and the host was `inline-block` where React's `<svg>` was `block`.                                                                       |
| 9   | Packet: "delivered routes screenshot-diff within threshold"                   | 12/12 shots are **outside** threshold with two Phase-2 restyles in place, and 12/12 **pass** with them backed out | The brass CTA and the `font-display` heading are deliberate DESIGN.md changes Phase 2's verifier signed off; the baselines predate them. Measured both ways — see §6.                       |

---

## 6. Verification actually run

```
npm run build        exit 0
npm run lint         exit 0   (--max-warnings 0)
npm run test:run     exit 0   146 tests, 21 files  (was 109 in 17)
npm run format:check exit 0
```

New specs: `login.component.spec.ts` (10), `signup-page.component.spec.ts`
(10), `google-callback-page.component.spec.ts` (8),
`google-oauth.service.spec.ts` (6), plus 3 added to `auth.store.spec.ts`.

### Parity suite (`E2E_BASE_URL=http://localhost:4200`, Go on `:5001`)

`e2e/` was **not** edited.

| Slice                       | Result | Notes                                                                                     |
| --------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `auth.spec.ts`              | 4 / 5  | The failure is **"signs in and lands on the dashboard"**: it asserts the user's full name is visible after login, which React renders in `UserProfileCard` on the dashboard. **Sub-feature 6 owns it.** The signup flow, the wrong-password flow and both guard specs pass. |
| `navigation.spec.ts`        | 21 / 21 | All 20 paths, all three roles.                                                            |
| `friends-and-theme.spec.ts` | 3 / 4  | The failure is the friends panel. **Sub-feature 4 owns it** — same failure Phase 2's verifier recorded. |

Both failures were reproduced **before** any of this slice's changes.

### Screenshot parity

`login`, `signup` and `google-callback`, both viewports, both themes — 12
shots, diffed against `.migration/baselines/` at the suite's own
`maxDiffPixelRatio: 0.01`, using an ad-hoc config outside `e2e/` (the
committed `baselines.spec.ts` photographs all 20 routes in one test and 17
are still placeholders).

- **As shipped: 12/12 outside threshold**, all at ratio 0.02 desktop /
  0.04 mobile (13,060–17,433 px).
- **With `variant="brass"` → `"default"` and `font-display` removed from the
  two headings: 12/12 pass.** The experiment was run and reverted.

So the entire residual is those two deliberate restyles: the CTA fill (a
396×44 button is 17,424 px on its own, which is the whole desktop number)
and the heading face. Everything else — nav bar, logo chip, card box, both
fields, the reveal toggle, the divider, the Google button, the footer link,
and the callback redirect — is pixel-clean at both viewports in both themes.
Getting there took the three fixes in §7; before them the diff was 8% and
the card sat 23 px low.

**The baselines are stale for these two properties, not wrong about
anything else.** DESIGN.md rule 4 names the login CTA as brass, and the
rollout's step 3 applies `font-display` to headings; Phase 2's verifier
checked both by eye and passed them. Recorded rather than reverted, because
relitigating a Phase-2 decision is not this slice's call.

---

## 7. Three kit defects found by pixel-diffing, and their fixes

All three were invisible to `npm run test:run` and to the E2E suite, and all
three affect every page. They are fixed; this section is so nobody undoes
them.

### 7.1 Card parts could not be overridden — now they take `className`

React's card parts ran base classes and the caller's through `cn()`
(tailwind-merge), so `shadow-lg` replaced `shadow-sm`, `text-3xl` replaced
both `text-2xl` **and** `leading-none` (a Tailwind font-size utility sets
line-height too, and tailwind-merge knows), and `space-y-1` replaced
`space-y-1.5`. Angular concatenated instead, so the winner was whichever
utility Tailwind emits last — which is **alphabetical within a plugin** and
therefore arbitrary: `text-sm` beat `text-base`, `shadow-sm` beat
`shadow-lg`, `leading-none` beat everything. The login card came out 46 px
short.

`shared/components/ui/card.directive.ts` now gives all six parts a
`className` input and a `[class]` host binding through `cn()`:

```html
<div appCard className="w-full max-w-md shadow-lg">
	<div appCardHeader className="space-y-1 text-center">
		<h1 appCardTitle className="font-display text-3xl">…</h1>
```

**Rule: overrides go through `className`; `class` is only for utilities that
cannot conflict with the part's base list.** That is now the same rule the
`display: contents` components already had, so there is one rule, not two.

### 7.2 `<ng-icon>` ignores `h-*`/`w-*`, and sits on a text baseline

@ng-icons writes `--ng-icon__size` as an **inline style** (default `1em`)
and sizes its host from it in a component stylesheet that is unlayered and
injected after `styles.css`. No class can beat an inline style, and on a
tie the later rule wins — so `class="h-8 w-8"` rendered a 16 px icon. The
nav logo was 8 px narrow, which pushed the whole centred nav strip sideways
in every screenshot.

Two fixes:

- **Size icons with the library's own input:** `<ng-icon size="1.25rem">`.
  `h-3→0.75rem`, `h-4→1rem`, `h-5→1.25rem`, `h-6→1.5rem`, `h-8→2rem`.
  Applied to the 14 icons in `navigation.component.html` and to this
  slice's. **Every later sub-feature must do the same** — a `h-*` class on
  an `<ng-icon>` is decoration, not sizing.
- **`styles.css` makes the host `display: block`** via `ng-icon[role="img"]`
  (an attribute selector, because it has to outrank the library's `:host`).
  Tailwind's preflight makes every `<svg>` block, so React's lucide icons
  were block; an `inline-block` host added descender space under each glyph.

### 7.3 `space-y-*` does nothing across a `display: contents` host

`space-y-4` puts `margin-top` on `> * + *` — which is the
`<app-form-field>` / `<app-button>` element itself, and **margins on a
`display: contents` box are ignored**. Two 16 px gaps vanished from the
login card.

**Rule: a container holding kit components uses `flex flex-col gap-*`, not
`space-y-*`.** Flex `gap` works because the contents host's own child is
what becomes the flex item. `space-y-*` is still correct for containers
whose children are all plain elements (the card header, the form field's own
label/control/error stack).

---

## 8. Gotchas worth carrying forward

- **`noUncheckedIndexedAccess` is on.** Indexing a lookup table by a number
  yields `T | undefined`; type the table `readonly T[]` and `?? FALLBACK`.
- **A `class` attribute in the template survives a directive's `[class]`
  host binding.** Template static styling outranks host bindings, so
  `<input appFormInput class="pr-10">` still gets `pr-10`. That is why §7.1
  needs `className` rather than "just use `class`".
- **`environment` is a mutable object**, which is how
  `google-oauth.service.spec.ts` tests the missing-client-id branch. Restore
  it in a `finally`.
- **`:4200` was free and CORS-approved.** The Go service's `ALLOWED_ORIGINS`
  allows **only** `http://localhost:4200` and `http://localhost:5173` — a
  dev server on any other port fails every request at the preflight. If
  `:4200` is taken, that is a coordination problem, not a "pick another
  port" problem.

---

## 9. What sub-features 2–6 still owe

- **2 (public):** nothing from here.
- **3 (account/profile):** the first real `rxResource` (§2.3). Reuse
  `passwordChangeSchema` and `deleteAccountSchema`, already ported in
  `shared/validators/auth.schemas.ts`.
- **4 (friends):** the friends panel `App.tsx` rendered when signed in;
  `FriendsUiStore` and the nav toggle exist. Owes the accessible names
  `Add friend`, `Back to friends`, `Add <name>` / `<name> added`, and fixes
  `friends-and-theme.spec.ts`.
- **5 (classes):** nothing special from here.
- **6 (dashboard):** must render the user's full name (fixes `auth.spec.ts`)
  **and** consume `AuthStore.takeNotice()` for the account-linked message
  (§2.5). Also owns the chart-library decision.
