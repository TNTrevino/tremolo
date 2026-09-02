# Phase 3, sub-feature 4 handoff — friends

Status: **built**. `npm run build`, `npm run lint`, `npm run test:run` and
`npm run format:check` all exit 0 (**177 unit tests in 25 files**, up from
146 in 21). Sub-feature 1's §2 pattern held without amendment.

This slice also owns **verifier finding V1** (the nav's `space-x-2`
cluster) — §5.

---

## 1. What exists now

| Area              | Files (all under `frontend/src/app/`)                                              |
| ----------------- | ---------------------------------------------------------------------------------- |
| DTO + domain      | `features/friends/models/friends.models.ts`                                        |
| Service (D5)      | `features/friends/services/friends.service.ts` (+ spec)                            |
| UI store (Ph. 2)  | `features/friends/services/friends.store.ts` — **unchanged**, see §2               |
| Panel shell       | `features/friends/components/friends-panel/` (+ spec)                              |
| Friends list      | `features/friends/components/my-friends-view/` (+ spec)                            |
| Add view          | `features/friends/components/add-friend-view/` (+ spec)                            |
| Row               | `features/friends/components/friend-card/`                                         |
| Shell wiring      | `app.component.{ts,html}` (+ spec)                                                 |
| V1 fix            | `core/components/navigation/navigation.component.html` (+ spec)                    |

`FriendsUiStore` needed no change. `AuthStore`, `NotificationService`,
`app-spinner`, `app-error`, `app-button` and `appInput` were all reused as
shipped.

---

## 2. The store question — answered: **no new store**

The packet asks whether `stores/friends.store.ts` is server data (→
`rxResource`, no store) or genuine client state (→ signal store). Read
literally, `frontend-react/src/stores/friends.store.ts` is **11 lines and
holds no server data at all**:

```ts
isPanelOpen: false,        // is the drawer open
searchQuery: "",           // text in the "Search friends..." box
togglePanel, setSearchQuery
```

So the answer is **both halves, and neither is new work**:

- **The client state stays a signal store.** It is exactly what D7 is for —
  two pieces of UI state read by two components that are not in an
  ancestor/descendant relationship (the nav bar's toggle and the panel).
  Phase 2 already ported it as `FriendsUiStore`, verbatim and complete;
  this slice added nothing to it.
- **The server data never was in the store.** It lived in TanStack
  (`useFriends`, `useSearchUsers`), and it becomes two `rxResource`s on the
  two components that display it. Nothing about friends is cached, shared
  or deduped (D6).

`searchQuery` is on the store rather than local to `MyFriendsViewComponent`
because React put it there, and that placement is observable: the text
survives closing and re-opening the panel. The add view's own query is
local `signal` state, again matching React's `useState`. The React
`FriendsUIStore` **interface** has no port — its fields are the service's
signals and its setters are its methods, so a second shape describing them
would only be a second thing to keep in sync.

### What replaced `invalidateQueries`

`useAddFriend` invalidated `friendsKeys.list()` so the list refetched. With
no cache there is nothing to invalidate, and nothing needed one:
`FriendsPanelComponent` renders the list and the add view through an
`@if (isAddMode())`, so pressing **Add friend** *destroys*
`MyFriendsViewComponent` and pressing **Back to friends** *re-creates* it —
and its `rxResource` fetches on creation. The just-added friend is on the
list because the list is new, not because a cache was busted. A spec pins
this (`friends-panel.component.spec.ts`, "swaps to the add view and back,
refetching the list on return"); so does the E2E flow's last assertion.

### What replaced `enabled`

- `useFriends`'s `enabled: isAuthenticated` → the panel is only in the tree
  for a signed-in user (`app.component.html`'s `@if`). No component, no
  resource, no request. `app.component.spec.ts` asserts an anonymous shell
  issues no friends request at all.
- `useSearchUsers`'s `enabled: trimmed.length > 0` → the search resource's
  `params` returns `undefined` for a blank query. **A resource with
  undefined params stays `idle` and never calls its stream.** That is also
  what makes "Search for someone by name" the initial state.
- The two `staleTime`s (60s / 30s) are cache tuning and have no meaning
  without a cache. Dropped, not replaced.

### What replaced the query cache's error toasts

`App.tsx`'s `QueryCache.onError` toasted every failed query whose `meta`
named an `errorTitle`, *on top of* whatever the component rendered inline.
Preserved, per-call-site:

| React                                    | Here                                                              |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `useFriends` → "Failed to load friends"  | an `effect()` on `friends.error()` → `showError(msg, title)`       |
| `useAddFriend` → "Failed to add friend"  | the `error` arm of the one-shot `.subscribe()`                     |
| `useSearchUsers` → `suppressErrorToast`  | inline text only, no toast — a spec asserts `showError` is not called |

The effect fires once per `null → error` transition, which is once per
failed attempt — the same cadence the cache handler had.

---

## 3. Two gotchas sub-features 3, 5 and 6 will hit

Both cost real time here. Neither is visible until you write the first
`rxResource` spec.

### 3.1 `await fixture.whenStable()` deadlocks while a resource is in flight

An `rxResource` registers a `PendingTasks` entry while it loads.
`HttpTestingController` does not answer until the test flushes. So the
canonical §2.4 opening —

```ts
fixture = TestBed.createComponent(PageComponent);
await fixture.whenStable();          // ← times out at 5000ms
```

— hangs for any component that fetches on creation, and the failure is a
bare "Test timed out in 5000ms" pointing at `whenStable`, followed by a
cascade of "Cannot configure the test module…" in every later test in the
file. **Flush first, settle after:**

```ts
fixture = TestBed.createComponent(PageComponent);
fixture.detectChanges();                       // lets the resource fire
backend.expectOne(URL).flush(rows);            // answer it
await fixture.whenStable();                    // now it settles
```

The same applies to any interaction that starts a request: click, then
`fixture.detectChanges()`, then `expectOne(...)`. Sub-feature 1 never met
this because none of the auth pages fetch on load (its §2.3 says so).
`whenStable()` is still right everywhere no request is outstanding.

### 3.2 `resource.value()` **rethrows** in the error state — `defaultValue` does not cover it

`defaultValue` applies to `idle` and `loading` only. Read `value()` while
the resource is errored and you get
`ResourceValueError: Resource is currently in an error state`, thrown out
of change detection.

The PLAN.md 5.2 template block hides this, because its `@else if (error())`
arm comes before any `value()` read. It bites the moment **anything outside
that ladder** reads the value — here, the count badge in the panel header,
which sits above the loading/error/list block:

```ts
protected readonly allFriends = computed(() =>
	this.friends.error() ? [] : this.friends.value(),
);
```

React's `data: friends = []` swallowed the failure the same way, so the
badge reads 0 on a failed fetch rather than taking down the panel.

---

## 4. What each piece does

### `FriendsPanelComponent`

Hangs off the **shell**, not a route: `app.component.html` renders it beside
`<router-outlet>`, inside `@if (auth.isAuthenticated())`, which is exactly
where and how `App.tsx` had it. That placement is the thing
`friends-and-theme.spec.ts` exists to catch.

The `<aside>` is **always mounted** and slides on `translate-x-full` ↔
`translate-x-0`, as in React — only the mobile scrim
(`aria-label="Close friends panel"`, `md:hidden`) is conditional. One
consequence worth knowing: because the aside is in the DOM when shut, its
contents are reachable to a DOM query before the toggle is pressed. React
behaves identically, so the parity suite is unaffected.

### `MyFriendsViewComponent`

`rxResource` → `getFriends()`. The search box filters the **already
fetched** list client-side across first name, last name, instrument and
school — it never touches `/api/friends/search`, which is the *add* view's
endpoint. The count badge counts the whole list, not the filtered one.
Empty states: "Looks lonely in here. Add some friends!" with no query,
"No friends found" with one.

### `AddFriendViewComponent`

`useDebounce(query, 120)` → `debounceTime(120)` on the query signal's
observable, read back through `toSignal` (which owns the subscription —
PLAN.md 5.6, nothing to tear down). The hook's `clearTimeout` cleanup is
what `debounceTime` does by definition. A spec collapses a three-keystroke
burst into one request.

The add is a one-shot `.subscribe()` in the handler. `addedIds` is a
`Set<number>` signal and the button flips in place —
`aria-label="Add <full name>"` becomes `"<full name> added"`, `variant`
goes `outline` → `ghost`, icon goes user-plus → check, and it disables. One
in-flight add at a time, which is what a single React `useMutation` gave.

The mount-time `inputRef.current?.focus()` is `afterNextRender(...)`.

### `FriendCardComponent`

React's `action?: React.ReactNode` prop becomes **content projection** —
the add view puts its button between the tags, the list projects nothing
and the slot collapses. Same move D9 makes for `GameDefinition`: markup
crosses a boundary as a template, never as data. Host is
`display: contents` so the row div is the scroll container's own child.

---

## 5. Finding V1 — fixed and proved

**The defect.** `navigation.component.html`'s right-hand cluster was
`<div class="flex items-center space-x-2">`. Its children are the theme
toggle, the friends toggle and the mobile-menu button — all `<app-button>`,
whose host is `display: contents` — plus the account menu (a plain
`<div class="relative hidden md:block">`).

`space-x-2` compiles to `margin-left: 0.5rem` on `> * + *`. The child
combinator matches the **`<app-button>` element**, not the `<button>` inside
it, and **margins on a `display: contents` box are ignored**. React's
`<Button>` *was* the button, so React's identical `space-x-2` spaced every
control. Ours spaced only the account menu.

Per viewport, signed in:

- **Desktop** — children are theme, friends, account, mobile-menu. The
  friends toggle lost its 8px; the account div kept its margin (plain
  element); the mobile-menu button's inner `<button class="md:hidden">` is
  `display: none`, so it contributes nothing. **8px missing.**
- **Mobile** — the account div is `hidden`, so the children that render are
  theme, friends, mobile-menu, all three `display: contents`. **Both gaps
  missing, 16px total**, and the mobile-menu button lands straight against
  the toggles, which is the symptom the finding names.

**The fix.** `flex items-center gap-2`. Flex `gap` works where `space-x-*`
does not, because the contents host's own child is what becomes the flex
item. This is the same rule sub-feature 1's handoff §7.3 wrote for
`space-y-*`; V1 is that rule's `space-x-*` twin, and the handoff now has
one rule covering both axes: **a container holding kit components spaces
them with flex `gap-*`.**

It is the only such cluster in the nav. The other four `space-x-*` uses
were checked and are all correct — the logo (`div` + `span`), the desktop
link strip (`<a>`s and a `<div>`), and the two account-menu rows
(`<ng-icon>` + `<span>`, and `ng-icon` is `display: block` per Phase 3.1
§7.2).

**Proof.** `navigation.component.spec.ts` gains
`describe("the right-hand control cluster (finding V1)")`: one test asserts
the cluster carries `flex` + `gap-2` and **no** `space-x-*`, the other
asserts all three affected controls are still inside it. A class assertion,
deliberately — jsdom applies no Tailwind, and the whole point of V1 is that
no behavioural test can see it. Reverting `gap-2` to `space-x-2` fails the
first test; see §7 for the mutation run and the live/screenshot evidence.

---

## 6. Deviations

| #   | What the plan/packet/prior handoff said                                        | What was done                                                                    | Why                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Task: "note the 3.1 verifier's finding V1 (STATE.md)"                          | `STATE.md` at this slice's base (`cdaef29`) has **no** 3.1 verifier section and no V1 | R5, and recorded rather than guessed. The finding was reproduced from first principles against the committed markup before fixing it (§5), so the fix does not depend on a document this worktree cannot see. The ledger entry is the verifier's to write. |
| 2   | Worktree rule: base on `feature/angular-migration`                             | The worktree came up on `main` (`b2a52b7`); reset onto `origin/feature/angular-migration` (`cdaef29`) | Same trap a prior agent hit, per the task. Recorded so it is fixed rather than re-discovered a third time.                                                                                                        |
| 3   | Packet: "if it is just server data, it becomes `rxResource` … no store at all"  | Both are true at once: no *new* store, and the Phase-2 `FriendsUiStore` stays     | The React store holds **only** client state (`isPanelOpen`, `searchQuery`) and never held server data. §2.                                                                                                        |
| 4   | React rendered its own `<Loader2>` and raw `error?.message` inside the panel     | `<app-spinner>` and `<app-error>`                                                 | PLAN.md 5.2's template block is the prescribed shape and `app-error` runs `getErrorMessage`, which is friendlier copy than an axios message. No baseline photographs the open panel, so this costs no parity.       |
| 5   | React's `FriendCard` took an optional `className`                               | Dropped                                                                          | Neither call site passed one. Dead API, and the kit's `className`-through-`cn()` rule (3.1 §7.1) is for parts that have base classes worth overriding.                                                            |
| 6   | React had a `FriendsUIStore` interface in `features/friends/types.ts`           | Not ported                                                                       | Its fields are `FriendsUiStore`'s signals and its setters are its methods. A second shape would only be a second thing to keep in sync. `Friend` **is** ported.                                                    |
| 7   | 3.1 §2.4: `createComponent` then `await fixture.whenStable()`                    | `createComponent`, `detectChanges()`, flush, **then** `whenStable()`               | `whenStable()` deadlocks while a resource holds a pending task that only the flush releases. §3.1. Not a change to the pattern, an extension of it to the fetch-on-load case 3.1 had no example of.                |
| 8   | Task: run the dev server on `:4200` or `:4300`, claiming the lock                | Ran on **`:5173`**, with its own lock                                            | Both lock directories were held for the entire run with **no listener on either port**. `:5173` is the second origin in the Go service's `ALLOWED_ORIGINS`, so it passes CORS. §7's environment note.               |

---

## 7. Verification actually run

```
npm run build        exit 0
npm run lint         exit 0   (--max-warnings 0)
npm run test:run     exit 0   177 tests, 25 files  (was 146 in 21)
npm run format:check exit 0
```

New specs: `friends.service.spec.ts` (5),
`my-friends-view.component.spec.ts` (8),
`add-friend-view.component.spec.ts` (9),
`friends-panel.component.spec.ts` (5), plus 2 added to
`navigation.component.spec.ts` (V1) and 2 to `app.component.spec.ts`.

### Parity suite (`E2E_BASE_URL=http://localhost:5173`, Go on `:5001`)

`e2e/` was **not** edited. Specs run unmodified.

| Slice                       | Result  | Notes                                                                                                                   |
| --------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| `friends-and-theme.spec.ts` | **4/4** | **The friends-panel test this slice owns is green.** It was the one failure Phase 2's verifier and sub-feature 1 both recorded. |
| `navigation.spec.ts`        | 21/21   | All 20 paths, all three roles. Unchanged by the always-mounted panel.                                                     |
| `auth.spec.ts`              | 4/5     | The failure is still "signs in and lands on the dashboard" — it wants the user's full name on the dashboard. **Sub-feature 6 owns it**, exactly as sub-feature 1 recorded. Not touched by this slice, and reproduced identically. |

The friends flow end to end against the live Go service: open the panel →
"Looks lonely in here" → **Add friend** → search by name → `Add <name>`
→ `<name> added` in place → **Back to friends** → the friend is on the
list. That last step is the `invalidateQueries` replacement working (§2).

### Finding V1 — measured, not eyeballed

The nav's right-hand cluster was measured three ways at both viewports.

**1. What the baselines actually contain.** The nav is the top 64px of every
baseline, and the baselines were captured at `deviceScaleFactor: 1`, so one
PNG pixel is one CSS pixel. Reading the ink columns straight out of
`dashboard-{desktop,mobile}-dark.png` (the signed-in nav):

| Viewport | Ink runs (x) | Ink gaps |
| -------- | ------------ | -------- |
| desktop  | sun `1139–1156`, users `1186–1205`, avatar `1224–1263` | **29, 18** |
| mobile   | sun `249–266`, users `296–315`, menu `345–362`         | **29, 29** |

Both reduce to an **8px control gap** once the buttons' 40px boxes and each
glyph's inset are taken out — i.e. `space-x-2`, working, because React's
`<Button>` was the button.

**2. The same measurement on the live Angular nav, with the fix:**

| Viewport | Ink runs (x) | Ink gaps | vs baseline |
| -------- | ------------ | -------- | ----------- |
| desktop  | `1139–1156`, `1186–1205`, `1224–1263` | 29, 18 | **identical** |
| mobile   | `249–266`, `296–315`, `345–362`       | 29, 29 | **identical** |

Every run's left and right edge matches the baseline to the pixel.

**3. The same page with the cluster reverted to `space-x-2`** (swapped at
runtime in the live DOM, so nothing else changes), `getBoundingClientRect`
on the controls themselves:

| Viewport | With `gap-2`                                  | With `space-x-2`                              |
| -------- | --------------------------------------------- | --------------------------------------------- |
| desktop  | theme `1128`, friends `1176`, account `1224` — gaps **8, 8** | theme `1136`, friends `1176`, account `1224` — gaps **0, 8** |
| mobile   | theme `238`, friends `286`, menu `334` — gaps **8, 8**       | theme `254`, friends `294`, menu `334` — gaps **0, 0**       |

Which is the finding, quantified: **8px lost at desktop, 16px at mobile**,
and the account menu keeps its margin at desktop because it is a plain
`<div>`, not an `<app-button>`. The reverted desktop ink confirms it from
the other side — the sun moves to `1147–1164` and its gap falls from 29 to
21.

Nav screenshots for all four cases were taken and compared by eye against
the baseline crops; the fixed pair is indistinguishable from the baseline,
the reverted pair visibly bunches the icons.

**Mutation.** Reverting `gap-2` to `space-x-2` in
`navigation.component.html` fails exactly one test —
`AssertionError: expected [ 'flex', 'items-center', 'space-x-2' ] to include 'gap-2'`
— with the other 15 in the file still green. Restored; `git diff` empty.

### Environment note

**Neither `:4200` nor `:4300` was usable.** Both `/tmp/tremolo-port-*.lock`
directories were held for the whole run while **nothing was listening on
either port** — stale locks, apparently. This slice ran on **`:5173`**,
which is the *other* origin in the Go service's `ALLOWED_ORIGINS` (it is
the React app's Vite port) and was free; a `/tmp/tremolo-port-5173.lock`
was taken and released. If you need a port and both of the usual two are
locked but idle, `:5173` works and passes CORS.

---

## 8. What later sub-features owe

- **3 (account/profile), 5 (classes), 6 (dashboard):** read §3 before
  writing your first `rxResource` spec. Both gotchas are generic.
- **Nobody owes the friends panel anything.** It is chrome, it is wired,
  and no route renders it.
- The `flex gap-*` rule now covers both axes (§5). If you find another
  `space-x-*` or `space-y-*` around kit components, it is a defect.
