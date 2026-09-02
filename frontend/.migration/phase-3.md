# Phase 3 — CRUD features

**Depends on:** 2 · **Weight:** ~25% · **Parallel:** yes, after sub-feature 1

## Objective

All non-music features on the PLAN.md §5.1/§5.2 pattern. If the data pattern is
wrong, it surfaces here — not in the games.

## Preconditions

```bash
grep -A4 '^| 2 ' frontend/.migration/STATE.md   # Phase 2 → done
cd frontend && npm run build                     # exit 0
curl -s localhost:5001/health || true            # Go service reachable
```

## Inputs

From `frontend-react/src/`:

- **Services + types**: `services/api/{user,classes,friends,auth}.service.ts`
  (+ `user.service.test.ts`, `classes.service.test.ts`),
  `services/api/types/` (9 files), `services/api/mappers/`
- **Features**: `features/auth` (148 LOC), `features/friends` (438),
  `features/classes` (1,777), `features/dashboard` (671)
- `stores/friends.store.ts`
- `shared/hooks/queries/` — 5 TanStack hooks. **Read for semantics** (which
  endpoint, what mapping, what triggers a refetch), then discard. Do not
  recreate caching or invalidation.
- **Pages**: Home, About, Login, Signup, GoogleCallback, Account, Profile,
  Classes, ClassDetail, Assignments, AssignmentPlay (+ its test), Dashboard
- `shared/components/charts/{TremoloLineChart,ActivityHeatmap}.tsx`

## Work — sub-packets, in order

Sub-features 2–6 may run as **parallel agents in separate worktrees** once
sub-feature 1 is verified. It is the pattern-setter; everything else copies its
shapes.

1. **auth screens** — login, signup, Google callback. _Smallest full slice of
   service + Signal Forms + rxResource. Write its handoff as
   `phase-3-subfeature-1-handoff.md` — the others read it._
2. **public** — home, about (static).
3. **account** — account + profile pages; `user.service`.
4. **friends** — `friends.service`. Read what `friends.store` actually holds:
   if it is just server data, it becomes `rxResource` state on the page (no
   store at all); only make it a signal store if it holds genuine client state.
5. **classes** — largest. Classes list, class detail (+roster), assignments,
   assignment-play plumbing. Teacher-guarded routes per Phase 1's handoff.
6. **dashboard** — **forces the deferred chart decision.** Verify the chosen
   library's Angular-22 peer range before installing (R6); candidates in
   PLAN.md §2. Hand-rolled SVG is acceptable for the heatmap. **Record the
   choice in STATE.md's deferred-decisions table.**

### Uniform rules

- Every service returns `Observable` (D5), with DTO snake_case → domain
  camelCase mapping at the service boundary.
- Every page consumes via `rxResource` (D6). No caching, no dedup, no
  `shareReplay`.
- TanStack hook _semantics_ are preserved; TanStack _machinery_ is not.

## Verify

```bash
cd frontend && npm run build && npm run lint && npm run test:run
grep -ri "tanstack\|useQuery\|queryClient" src/    # → no matches
```

- Each sub-feature ports or rewrites its existing tests (`classes.service.test`,
  `user.service.test`, `AssignmentPlayPage.test`, store tests).
- Integration: each route exercised against live local backends.
- **Parity**: the Phase 0 E2E specs for these flows pass **unmodified** against
  Angular; delivered routes screenshot-diff within threshold against
  `.migration/baselines/` (chart interiors masked per the dynamic-content
  carve-out).

## Exit criteria

- [ ] Every non-game route functional end-to-end against the Go service
- [ ] Dashboard charts render with real score data
- [ ] Chart decision recorded in `STATE.md`
- [ ] No TanStack-shaped code anywhere in `frontend/src`
- [ ] E2E specs for these flows green, unmodified
- [ ] Screenshot diffs within threshold
- [ ] build/lint/test exit 0

## Handoff must record

- Chart library decision + rationale
- Friends-store disposition (store vs. plain resource) and why
- Any endpoint/DTO surprises per feature
- Confirmation that the sub-feature-1 pattern held for all six
