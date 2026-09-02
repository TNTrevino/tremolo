# Phase 2 — Shared UI kit

**Depends on:** 1 · **Weight:** ~15% · **Parallel:** no

## Objective

Every primitive downstream features compose from. No feature work starts until
this lands.

## Preconditions

```bash
grep -A3 '^| 1 ' frontend/.migration/STATE.md   # Phase 1 → done
cd frontend && npm run build                     # exit 0
```

## Inputs

**Read `frontend-react/DESIGN.md` first — it is the source of truth for all
visual work** (ink/paper/brass tokens; brass is scarce; `--accent` is a hover
wash, never emphasis). Parity with it is non-negotiable; the screenshot
baselines will catch violations.

From `frontend-react/src/`:

- `shared/components/ui/` — button, card, confirm-dialog, dialog, input,
  label, select, skeleton, toast (10 files, hand-rolled shadcn-style, **no
  Radix**), plus `button.test.tsx`
- `shared/components/forms/` — FormError, FormField, FormInput, FormLabel,
  FormSelect + its `README.md`
- `shared/components/layout/Navigation.tsx` + `Navigation.test.tsx`
- `stores/theme.store.ts` — note the `documentElement` class toggle and
  `onRehydrateStorage`
- `shared/hooks/useToast.tsx`
- `lib/utils.ts` (`cn()`)
- `shared/components/{ErrorBoundary,ComponentErrorBoundary,QueryState}.tsx`,
  `shared/components/fallbacks/`
- `shared/hooks/{useBreakpoint,useCopyToClipboard,useDebounce}.ts`
- `shared/components/music/RhythmGlyph.tsx` + test

## Work

- **10 UI primitives** → standalone components/directives. Keep the CVA
  variant API on button. `cn()` (clsx + tailwind-merge) ports verbatim to
  `shared/utils/`.
- **Icons** (D12): `@ng-icons/core` + `@ng-icons/lucide`. Register only icons
  actually used — grep `lucide-react` imports across `frontend-react/src`
  (33 files) and build the exact list. Verify the peer range first (R6).
- **Form components** on **Signal Forms** with zod via
  `validateStandardSchema` (D11). Prove the pattern with the login/signup
  schemas from Phase 1.
- **`ThemeStore`** (signals + localStorage key `tremolo-theme` +
  `documentElement` class toggle, matching today's rehydrate behavior).
- **Navigation** component.
- **Toast** (D13) backing the real `NotificationService` whose interface came
  from Phase 1's handoff.
- **Small utilities**: `useDebounce` → `debounceTime` at consumption sites;
  `useBreakpoint` → a signal over `matchMedia`; `useCopyToClipboard` → a tiny
  service.
- **`QueryState` is deleted, not ported** — its job is the PLAN.md §5.2
  template block. Build `app-spinner` and `app-error` for those branches.
- **Error handling (known gap, PLAN.md §8):** Angular has no per-component
  error boundary. Provide a global `ErrorHandler` that logs + toasts, and
  accept coarser granularity than the React boundaries. **Record the decision
  and its granularity in the handoff.**
- **Demo route `/dev/kit`** (unguarded, trivially removable) rendering every
  primitive in both themes.

## Verify

```bash
cd frontend && npm run build && npm run lint && npm run test:run
```

Component tests required: button variants; dialog open/close/escape; select
keyboard nav; toast show/dismiss; form field error display driven by a zod
schema; RhythmGlyph rendering (port existing test).

## Exit criteria

- [ ] All 10 primitives + 5 form components render on `/dev/kit`, light and dark
- [ ] A zod schema round-trips through Signal Forms (error appears, clears on fix)
- [ ] `grep -r "lucide-react\|ngx-toastr" frontend/package.json` → no matches
- [ ] Visual spot-check against `DESIGN.md` tokens — brass used sparingly,
      `--accent` only as hover wash
- [ ] build/lint/test exit 0

## Handoff must record

- Each primitive's Angular API where it differs from the React version
  (Phase 3+ consumes these)
- The registered icon list
- The error-handling granularity decision
- The Signal Forms + zod wiring pattern, as a copyable example
