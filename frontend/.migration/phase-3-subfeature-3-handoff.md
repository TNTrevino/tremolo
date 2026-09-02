# Phase 3, sub-feature 3 handoff — account (account + profile + `user.service`)

Status: **built**. `npm run build`, `npm run lint`, `npm run test:run` and
`npm run format:check` all exit 0 (**181 unit tests in 24 files**, up from
146 in 21). Every endpoint the ported service touches was probed against
the live Go service on `:5001`.

**Read §2 first.** The packet expected this slice to be the migration's
first `rxResource` consumer. It is not, and the reason is a finding rather
than an omission. **Sub-feature 6 must read §4** — the profile DTO the
dashboard depends on is not the shape React's types claim.

> **This slice was built by two agents.** The first hit its API limit while
> writing this file, leaving four commits, one uncommitted fix and this
> handoff complete to §9. The second audited the lot against the disk
> rather than trusting it, reproduced every number below independently,
> and committed the fix. What that audit found is §6.1 and deviation 8.

---

## 1. What exists now

| Area                | Files (all under `frontend/src/app/`)                             |
| ------------------- | ----------------------------------------------------------------- |
| Wire + domain types | `shared/models/{user,chart,game}.models.ts`                       |
| User HTTP           | `shared/services/user.service.ts` (+ spec, 18 cases)              |
| Account page        | `features/account/components/account-page/*.{ts,html,spec.ts}`    |
| Profile page        | `features/account/components/profile-page/*.{ts,html,spec.ts}`    |

Both pages replace the Phase 1 placeholders in place; `app.routes.ts` needed
no edit, because the placeholders were already the routed components.

### Why the service lives in `shared/`, not `features/account/`

`features/account/services/` exists (Phase 1 left the `.gitkeep`) and the
packet files `user.service` under this sub-feature — but neither page here
calls it. Its real consumers are the dashboard, the note game, the four
identification games and the assignment-play page, all in other features.
Putting it under `features/account/` would make five features import across
a sibling boundary to reach it. PLAN.md §4 already maps
`services/api/types/` → `shared/models/` and puts a data service in
`shared/services/`, so that is where both halves went.

---

## 2. `rxResource`: this slice does not use it either, and should not

Sub-feature 1 recorded that the three auth screens are all mutations, and
named this slice as "the first honest consumer" of PLAN.md §5.2. **That
expectation was wrong about these two pages, and it was wrong for a reason
worth writing down: neither page fetches anything, in React or here.**

- `ProfilePage` reads `firstName`, `lastName`, `email` and `role` off the
  Zustand auth store and renders six cards describing features that do not
  exist yet. No query hook, no `useEffect`, no request.
- `AccountPage` reads `email` off the same store. Its password form, its
  "Download All My Data" button and its account deletion each end in a
  toast — `showInfo("Password update functionality coming soon!")`,
  `showInfo("Your data download will begin shortly. (Feature coming soon)")`,
  `showSuccess("Account deletion would occur here")` — because **the Go
  service registers no route for any of them** (§4.2).

Both ports read `AuthStore.user()` and stop there. Manufacturing a fetch to
satisfy the packet would have meant inventing UI React does not have, which
would have broken the screenshot parity the same packet requires two lines
later.

**So PLAN.md §5.2 is still unexercised at the end of sub-feature 3.** It is
now sub-features 4 (friends), 5 (classes) and 6 (dashboard) that own it —
those three are genuinely fetch-driven, and 6 is the one that consumes this
slice's `UserService`. Whoever gets there first should write the §5.2
loading/error/value template branches exactly as the plan spells them, and
record in their handoff that they did, because three slices have now passed
the baton on it.

What this slice *does* pin, for whoever gets there:

- **`UserService` is `rxResource`-ready.** Every method returns a cold
  `Observable` from `HttpClient`, so `stream: () => this.users.getProfile(id)`
  works with no adapter, and the resource's teardown cancels the request.
- **Nothing memoises.** No `shareReplay`, no cache, no dedup layer, per D6.
  The dashboard calling `getProfile` while a sidebar also calls it will make
  two requests. That is the policy, not a bug to fix.
- **A mutation is still a plain `.subscribe()` in the handler** (PLAN.md
  §5.6). Both forms on the account page follow sub-feature 1's shape:
  `markAsTouched()` → `invalid()` → act. Neither stores a `Subscription` and
  neither writes `ngOnDestroy`.

---

## 3. What each page does

### Account (`/account`)

Five cards — Account Security, Email Management, Privacy Settings, Data &
Privacy, Danger Zone — plus a deletion modal. Full React parity including
the wording of every toast, which the specs pin verbatim.

Two Signal Forms, matching React's two `useForm`s:

| Form     | Schema                 | Submit does                                                        |
| -------- | ---------------------- | ------------------------------------------------------------------ |
| password | `passwordChangeSchema` | validates, raises the coming-soon toast, clears itself              |
| delete   | `deleteAccountSchema`  | validates, compares the typed email, then signs out and goes to `/` |

- **`form().reset(blank)` is React Hook Form's `reset()`.** It clears
  `touched`/`dirty` *and* writes the model back in one call, which is what
  keeps a stale "At least 8 characters" from hanging under an emptied field.
  Passing no argument resets only the flags — the data model is untouched.
- **The reveal toggle drives all three password fields**, from one
  `showPasswords` signal, exactly as React's single `showPasswords` state
  did. It carries **no `aria-label`**, for the reason sub-feature 1 §4
  gives: `getByLabel("Password")` is a substring match, so any name
  containing "password" would match the button as well as the fields. A spec
  asserts no control on the page has such a name.
- **The deletion confirmation is a hand-rolled `fixed inset-0` overlay**, not
  `<app-dialog>`. React hand-rolled it too, and the shared dialog renders
  different markup — using it would have been a restyle.
- The confirmed deletion calls `AuthService.logout()` (local-only and
  synchronous; the Go service has no logout endpoint) and then navigates,
  where React went through `useLogout().mutate(_, { onSuccess })`.

### Profile (`/profile`)

A session header — initials chip, full name, email, title-cased role — then
six "proposed feature" cards, then a Coming Soon notice.

React repeated the same card block six times; here it is a `featureCards`
array and one `@for`. The DOM is identical. The Tailwind class strings in
that array are **literals**, never assembled from a `tone` discriminator:
Tailwind's scanner reads `src/**/*.{ts,html}`, so a literal in the `.ts` is
found and `` `bg-${tone}/10` `` never would be (the trap sub-feature 1 hit
as its deviation 5).

`initials` uses `charAt(0)`, not `[0]`: `noUncheckedIndexedAccess` types the
index access `string | undefined`, and an empty name should render nothing
rather than `undefined`.

---

## 4. Endpoint and DTO surprises

Everything below was confirmed by `curl` against the running Go service, not
inferred from Go source.

### 4.1 `GET /api/users/:id/general-info` returns six fields, not ten — **sub-feature 6 owns the consequences**

React's `services/api/types/user.types.ts` declares ten fields.
`backend/main/DTOs/general_user_info_dto.go` serialises six. Live response:

```json
{"first_name":"Probe","last_name":"User","role":"STUDENT",
 "created_date":"Joined 20 Aug 2026","total_entries":1,
 "total_duration":"00:00:00"}
```

| React's `GeneralUserInfo` | Reality                                                    |
| ------------------------- | ---------------------------------------------------------- |
| `id`, `email`             | never sent                                                 |
| `created_at`              | never sent. It is `created_date`, **pre-formatted** as `"Joined 20 Aug 2026"` — not an ISO date |
| `total_sessions`          | never sent. The count is `total_entries`                    |
| `total_questions`         | never sent                                                  |
| `average_accuracy`        | never sent                                                  |
| `average_npm`             | never sent                                                  |
| —                         | `total_duration`, `"HH:MM:SS"`, undeclared in React          |

**This is a live React bug, not migration damage.** `useDashboardData` reads
`userProfile.totalSessions ?? 0` for all four stats, so React's dashboard
has always shown four zeroes; `UserProfileCard` does
`new Date(user.createdAt)` on a field that never arrives, so its join date
is an Invalid Date.

`shared/models/user.models.ts` models what Go actually sends and drops the
six phantoms. Carrying them across as permanently-`undefined` optionals
would have kept the bug silent for another year; a missing field is a
compile error the moment sub-feature 6 reaches for it.

**Sub-feature 6 therefore has a decision to make, and it is yours, not
mine:** the dashboard's four stat tiles have no data behind them. Either
reproduce React's zeroes (screenshot parity, bug preserved), or wire
`totalEntries` into the sessions tile and drop the other three (correct,
and the `dashboard-*` baselines will diff). Phase 3's exit criteria say
"Dashboard charts render with real score data" — the *charts* do
(`/api/charts/user/:id/metrics` is real and populated, §4.3); the *stat
tiles* are the open question.

### 4.2 Four `UserService` methods addressed routes that do not exist

`updateProfile`, `changePassword`, `deleteAccount` and `downloadUserData`
targeted `PATCH /api/users/:id`, `POST /api/users/:id/change-password`,
`DELETE /api/users/:id` and `GET /api/users/:id/data-export`. Grepping every
route registration in `backend/main/controllers/` finds none of them —
`SetupUserInfoRoutes` mounts exactly one, the GET above. Nothing in React
called them either, which is exactly why the account page answers with
toasts.

They are **not ported**. Porting them would have handed the next builder
four methods that 404, and would have made "wire up the account page" look
like a five-minute job.

### 4.3 The rest matches React's types exactly

Probed and confirmed: `/api/note-game/entry` (POST), `/api/note-game/recent`,
`/api/note-game/activity`, `/api/charts/user/:id/metrics`,
`/api/charts/teacher/class-metrics`, `/api/note-game/settings`,
`/api/game-settings`, `/api/note-game/keyboard-bindings`.

Two behaviours worth knowing:

- **"Nothing saved yet" comes back as `{"settings": null}` with HTTP 200**,
  for both `/api/note-game/settings` and `/api/game-settings`. React's
  private `getOrNull` also handled a 404; the live service does not appear to
  send one, but the 404 branch is kept and tested — it costs one line and a
  wrong guess here turns a first-ever visit into an error screen. Anything
  that is neither is re-thrown, so a real 500 still reaches `error()`.
- **Keyboard bindings are auto-created**: a brand-new user's first GET
  returns a full default map with HTTP 200, never the sentinel.
- **`PUT /api/note-game/settings` validates the range endpoints against
  `^[A-G][0-9]$`** — `"C4"`, not `"C"`. A bare note name binds fine and then
  fails inside the service, so the reply is a flat
  `400 {"error":"Failed to update settings"}` with nothing naming the field.
  Found by probing; **the note-game phase will hit this** if it sends the
  scale-degree letter instead of a pitch. `low_note`/`high_note` are the only
  fields with this shape; `scale` is a free string and `octave` is a number.
  The `user.service.spec.ts` fixture uses the exact body the live service
  accepted.

### 4.4 Where the mapping is, and the two things that keep their wire spelling

Every snake_case key is translated inside `UserService`. React returned raw
DTOs and mapped a layer higher (inside the profile query hook); with that
hook layer gone, phase-3.md's uniform rule puts it at the service boundary,
so nothing above `shared/services/` ever sees a snake_case key.

Two deliberate exceptions, both because the strings are **data, not property
names**:

- **`GameType`'s values** stay `"key_signature"` etc. They are identifiers
  the Go service validates against `dtos.ValidGameTypes` and that ride in a
  query string. The root `CLAUDE.md` pins this union to that table.
- **`KeyBindings`' keys** stay `key_c_sharp`. It is a dictionary keyed by
  note name, not a struct; renaming its 21 keys would buy nothing and cost a
  translation table in both directions.

`GameSettings.config` is likewise passed through **verbatim** in both
directions — it is the JSONB blob each game owns, validated on the way in by
the frontend's own `sanitizeConfig`. Rewriting keys inside it would break
every saved config in the database. A spec pins that
(`{ snake_case_key, camelCaseKey }` round-trips untouched).

Everything else got a `*Dto` (wire) / plain (domain) pair and a mapper:
`GeneralUserInfo`, `GameEntry`, `DailyActivity`, `NoteGameSettings`,
`GameSettings`' envelope, `KeyboardBindings`' envelope.

### 4.5 `saveGameResult` — the one behaviour that must not change

`assignment_id` is **omitted** from the body when the play is untagged, never
sent as `null`. React's `user.service.test.ts` had exactly two cases and both
were about this; both are ported verbatim as the first two under
`describe("saveGameResult")`. `game_type` defaults to `"note"` and is always
sent explicitly.

---

## 5. Deviations

| #   | What the plan/packet said                                                          | What was done                                                                      | Why                                                                                                                                                                                                            |
| --- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Packet + 3.1 §9: sub-feature 3 is "the first honest `rxResource` consumer"          | No `rxResource`. Both pages read `AuthStore` and fetch nothing                      | Neither page fetches in React either — profile renders the session, and all three account actions end in a toast because no backend route exists. Inventing a fetch would have broken the screenshot parity the same packet requires. §2. |
| 2   | Packet Inputs: `services/api/user.service.ts` as one unit                           | Ported minus four methods (`updateProfile`, `changePassword`, `deleteAccount`, `downloadUserData`) | R5. All four address routes `backend/main/controllers/` never registers, and nothing called them in React. §4.2.                                                                                              |
| 3   | React's `user.types.ts` declares ten `GeneralUserInfo` fields                       | Six, matching the live payload; `created_date` typed as pre-formatted text          | R5, verified by `curl`. The four stats and `createdAt` never arrive; React masks it with `?? 0` and renders an Invalid Date. Typed away so sub-feature 6 gets a compile error instead of silence. §4.1.        |
| 4   | Packet: DTO snake_case → camelCase mapping at the service boundary, uniformly       | `GameType`'s values, `KeyBindings`' keys and `GameSettings.config`'s contents keep their wire spelling | All three are data rather than property names — a validated identifier, a note-keyed dictionary, and a JSONB blob the games own and `sanitizeConfig` validates. §4.4.                                        |
| 5   | Packet: `user.service` belongs to the account sub-feature                           | `shared/services/user.service.ts`, models in `shared/models/`                       | Neither account page calls it; its consumers are dashboard, note game, the four identification games and assignment-play. PLAN.md §4 maps `services/api/types/` → `shared/models/` anyway. §1.                 |
| 6   | React's password form renders a `passwordErrors.root` banner                        | Not ported                                                                          | `zodResolver` never populates `root` and nothing calls `setError("root")`, so the branch is unreachable in React. Server errors have no route to come from here (§4.2).                                          |
| 7   | DESIGN.md rollout step 3 applies `font-display` to headings; 3.1 applied it to the auth card titles | Not applied to these two pages                                                       | Rollout step 3 names the **HomePage** rebuild. 3.1 measured that the same change costs every shot on a page its threshold (its deviation 9). These are ports, not restyles; extending a Phase-2 decision to new pages is not this slice's call either. |
| 8   | One agent builds a sub-feature start to finish                                      | Two: the first died mid-handoff at its API limit, the second audited and finished it | Not a choice. Recorded because the audit is the only reason the `self-start` fix (§6, Finding A) is in a commit rather than lost in a dirty tree — every number in §6 was re-measured from scratch before being believed. §6.1. |

---

## 6. Verification actually run

### 6.1 The second agent's audit — everything below was re-run, not inherited

The first agent died between finishing this file and committing. What it
left: four commits, a clean-but-unstaged `account-page.component.html`, and
this handoff untracked. Its claims were treated as a hypothesis.

**Every gate re-run from scratch:** build, lint (`--max-warnings 0`),
`test:run` (**181 passed, 24 files** — the claimed count exactly),
`format:check`, and the packet's `grep -ri "tanstack\|useQuery\|queryClient"
src/` → no matches. All exit 0.

**The uncommitted diff was judged a real fix and committed**, not discarded.
It is Finding A's `className="self-start"` — the change the screenshot table
below was measured with, which is why the table reproduced only with it
applied. `button.component.ts:121` does declare a `className` input, so it
binds. Had it been dropped, the four `account-*` shots would have regressed
by ~17,000 pixels and nothing in the unit suite would have said so.

**Both live findings re-probed** against the Go service, not re-read:
`GET /api/users/1500/general-info` returned the six fields of §4.1 verbatim
(`created_date: "Joined 20 Aug 2026"`, no `email`, no `average_accuracy`),
and all four routes of §4.2 answered **404** — `PATCH /api/users/:id`,
`POST …/change-password`, `DELETE /api/users/:id`, `GET …/data-export`.

That last one also disposes of a check the orchestrator asked for: **there
is no "profile update round-trip" to verify.** The update endpoint does not
exist, so the profile page is read-only by construction (§2). What was
verified instead is that both pages render the **live** session — a freshly
seeded random student's email, full name and title-cased role, asserted
through the accessible tree after a real login against `:5001`.

**All eight screenshot numbers reproduced exactly** — 1291/1269/271/235 and
1301/1283/280/248, same dimensions, from an independent run against a fresh
`ng serve`. Both runs used a throwaway config and specs **outside `e2e/`**,
deleted afterwards; `git status` confirms the suite is untouched.

```
npm run build        exit 0
npm run lint         exit 0   (--max-warnings 0)
npm run test:run     exit 0   181 tests, 24 files  (was 146 in 21)
npm run format:check exit 0

grep -ri "tanstack\|useQuery\|queryClient" src/    → no matches
```

New specs: `user.service.spec.ts` (18), `account-page.component.spec.ts`
(12), `profile-page.component.spec.ts` (5).

The component specs drive the DOM the way the parity suite does — headings,
`<label for>` pairs, button text, `[aria-label]` — never component
internals. Toasts are asserted through the **real** `NotificationService`
queue rather than a spy, because the queue is the observable behaviour and a
spy would still pass if the service stopped queueing.

### Live probe against the Go service (`:5001`)

A throwaway student was registered, logged in, and used to `curl` all eight
endpoints the service touches. Findings are §4; the shapes in
`shared/models/` are transcribed from those responses.

### Screenshot parity — **8/8 pass, 13× to 38× under threshold**

`account` and `profile`, both viewports, both themes, diffed against
`.migration/baselines/` at the suite's own `maxDiffPixelRatio: 0.01`. `e2e/`
was **not** edited; the check ran from a throwaway config and spec outside
it, both deleted afterwards.

| Shot                   | Size       | Differing px | Ratio       |
| ---------------------- | ---------- | ------------ | ----------- |
| `account-desktop-light`| 1280×1662  | 1291         | **0.00061** |
| `account-desktop-dark` | 1280×1662  | 1269         | **0.00060** |
| `account-mobile-light` | 390×2046   | 271          | **0.00034** |
| `account-mobile-dark`  | 390×2046   | 235          | **0.00029** |
| `profile-desktop-light`| 1280×1338  | 1301         | **0.00076** |
| `profile-desktop-dark` | 1280×1338  | 1283         | **0.00075** |
| `profile-mobile-light` | 390×2402   | 280          | **0.00030** |
| `profile-mobile-dark`  | 390×2402   | 248          | **0.00026** |

Numbers taken with the threshold forced to zero, so those are the true
residuals: text antialiasing, nothing structural. Note this is a **better**
result than 3.1's 12/12-outside — because neither of these pages carries the
brass CTA or a `font-display` heading (deviation 7), so 3.1's two known
residuals do not apply here. Nothing in 3.1's §7 kit fixes had to be
revisited.

Getting there took two findings.

#### Finding A — `flex flex-col gap-*` stretches a button that used to shrink to fit. **Every later sub-feature will hit this.**

3.1 §7.3's rule is right about spacing and incomplete about sizing. Swapping
`space-y-4` for `flex flex-col gap-4` also changes the **cross axis**: a
column flex container defaults to `align-items: stretch`, so React's
`inline-flex` button — shrink-to-fit in block flow — became full-card-width.
On `account-desktop-light` that one button was ~17,000 of the 25,932
differing pixels.

`items-start` on the container is the wrong fix: the form fields above it
*should* stretch. The button opts out on its own:

```html
<app-button type="submit" className="self-start">
```

**Rule to carry forward: when you swap `space-y-*` for `flex flex-col
gap-*`, every child that was shrink-to-fit needs `self-start`.** In practice
that means buttons and chips; anything full-width already was already
stretching. This is invisible to `npm run test:run` — only a pixel diff
finds it.

#### Finding B — the baselines bake in a **random email address**, and no re-run can reproduce it

`e2e/support/api.ts`'s `createUser` builds the address as
`` `${unique("e2e")}@tremolo.test` `` — `Date.now().toString(36)` plus six
random characters. The account and profile pages both render the signed-in
user's email, so the exact string is baked into four baselines and is
**unrecoverable from the capture run**. `baselines.spec.ts` overrides
`firstName`/`lastName` to "Baseline"/"Student"; it does not, and cannot,
pin the email.

It is not cosmetic. At 390px the baseline's 32-character address **wraps to
two lines**; a shorter one does not, and the page comes out 28px shorter —
so every element below the Email Management card is offset and the mobile
shots fail on dimensions before any pixel is compared. That is exactly what
happened here on the first run (390×2046 expected, 390×2018 received).

Read out of the baseline: **`e2e-mt1x3ez2-2gjrv9@tremolo.test`**. Feeding
that exact string in produced the table above, which is what proves the
residual is antialiasing and not layout.

**This is a harness gap, not a port defect, and it is now on the critical
path** — the dashboard renders the user's name and the classes pages render
rosters. Two ways out, both cheap, neither this slice's call:

1. Give `createUser` a deterministic email when
   `baselines.spec.ts` seeds (it already passes deterministic names), and
   re-capture the affected baselines against React.
2. Add the email/name region to the existing dynamic-content mask, next to
   the staff.

Option 1 is better — masking hides a region that should be compared. Until
one of them lands, **anyone diffing a route that shows a user's email must
seed `e2e-mt1x3ez2-2gjrv9@tremolo.test` or read the string out of their own
baseline the same way** (crop the PNG and look at it), or they will chase a
layout ghost.

---

## 7. Gotchas worth carrying forward

- **`form().reset(value)` is the full React Hook Form `reset()`.** With no
  argument it clears `touched`/`dirty` only — the data model is untouched,
  and a form that looks reset will still hold what the user typed.
- **`<app-button>` has no `(click)` output and does not need one.** It
  renders a real `<button>` under a `display: contents` host, so a `(click)`
  written on `<app-button>` catches the bubbled event. `className`, not
  `class`, for extra classes — the host box has no rendering.
- **A container holding kit components uses `flex flex-col gap-*`.** Both
  forms here would have lost their 16px gaps to `space-y-4`, for the reason
  3.1 §7.3 gives.
- **Size every `<ng-icon>` with `size="…"`** (3.1 §7.2). `h-6 w-6` on the
  card-header icons would have rendered 16px glyphs and shifted every card
  header.
- **`grep -ri "tanstack" src/` is part of the packet's Verify.** A doc
  comment mentioning TanStack by name trips it — say "the query hook layer"
  instead. `.migration/` is outside `src/`, so this file is free to.
- The Go service **auto-creates keyboard bindings** on first read, so the
  note-game phase does not need a "no bindings yet" branch for them (it does
  for both settings endpoints).

---

## 8. What the remaining sub-features owe

- **4 (friends), 5 (classes):** §5.2's `rxResource` shape is still
  undemonstrated — see §2. Whoever lands first should write it exactly as
  the plan spells it and say so in their handoff.
- **6 (dashboard):** owns §4.1's decision about the four stat tiles, and is
  `UserService`'s first real consumer (`getProfile`, `getStats`,
  `getClassMetrics`, `getRecentGameEntries`, `getActivityHeatmap`). Still
  owes what 3.1 §9 listed: the user's full name (fixes `auth.spec.ts`) and
  `AuthStore.takeNotice()` for the account-linked message.
- **Everyone:** `shared/models/{chart,game}.models.ts` were created here
  because `UserService` needs them. Sub-features 5 and 6 ran in parallel and
  may have created files of the same name; if so, merge rather than replace —
  the shapes here are transcribed from live responses.

---

## 9. Ledger line for `STATE.md` (this slice did not edit it)

Deviations for the table, prefixed `3.3`: the eight rows in §5.

Suggested Phase 3 note addition:

> **Sub-feature 3 (account) built 2026-08-20** — account and profile pages
> at React parity over their Phase 1 placeholders, `UserService` ported onto
> Observables with the DTO boundary in `shared/services/` + `shared/models/`.
> build/lint/test:run/format:check all exit 0 (181 tests, 24 files). All
> eight endpoints probed live against the Go service; two findings recorded
> (`general-info` returns six of the ten fields React declares; four service
> methods addressed routes that do not exist). **`rxResource` is still
> unexercised** — neither page fetches, in React or here; sub-features 4-6
> own PLAN.md §5.2's first demonstration. Screenshot parity **8/8, 13×–38×
> under threshold**. Built by two agents (the first hit its API limit
> mid-handoff); the second re-ran every gate, re-probed both live findings
> and reproduced all eight screenshot numbers before accepting them (§6.1).
> 8 deviations below.
