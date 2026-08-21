# Parity report — Phase 7 cutover gate

The gate that had to pass **before** `frontend-react/` was deleted. Everything
below was measured on `feature/angular-migration` at `7ba576d`, against the
Angular app served from `frontend/` on `http://localhost:4300` (server cwd
verified through `/proc/<pid>/cwd`), with both backends live (Go `:5001`,
Python `:8000`, Postgres `:5432`) on Node v24.19.0.

## 1. E2E — the golden suite, unmodified

```
E2E_BASE_URL=http://localhost:4300 npx playwright test --project=golden
→ 43 passed (2.4m)
```

`git status --porcelain e2e/` was empty before the run: the specs are the same
bytes that were written against React in Phase 0. **43 / 43.**

| Spec | Result |
| ---- | ------ |
| `navigation.spec.ts` | 21 / 21 |
| `auth.spec.ts` | 5 / 5 |
| `friends-and-theme.spec.ts` | 4 / 4 |
| `classes.spec.ts` | 4 / 4 |
| `games.spec.ts` | 6 / 6 |
| `settings.spec.ts` | 3 / 3 |

## 2. Screenshots — all 80 baselines

20 routes x 2 viewports (desktop 1280x800, mobile 390x844) x 2 themes
(light, dark), diffed against `.migration/baselines/` at the harness threshold
`maxDiffPixelRatio: 0.01`.

`baselines.spec.ts` uses a hard `expect(...).toHaveScreenshot()`, so a failing
shot aborts the rest of its pass and only the first failure per pass is ever
reported. To report all 80 the sweep ran a **soft-assertion copy** of that
spec (`expect.soft`, every other byte identical, generated with `sed`) under a
throwaway config. Both the copy and the config were deleted after the run;
`e2e/` and `.migration/baselines/` are untouched, and the committed
`baselines.spec.ts` is unchanged.

**Result: 68 pass, 12 over threshold, 0 OPEN.**

Every route that is not `login` / `signup` / `google-callback` is inside
threshold at both viewports in both themes — including all four game routes,
`assignment-play`, `/note-game`, `/sheet-music`, `/dashboard`, `/classes`,
`/classes/:id`, `/assignments`, `/profile`, `/account`, `/home`, `/about`,
`/convert` and the `/` redirect.

### The 12 over-threshold diffs

| # | Shot | Size | Differing px | Ratio | Diff image | Status |
| - | ---- | ---- | ------------ | ----- | ---------- | ------ |
| 1 | `login-desktop-light` | 1280x866 | 19,742 | 0.0178 | [diffs/login-desktop-light-diff.png](diffs/login-desktop-light-diff.png) | **ACCEPTED** |
| 2 | `login-desktop-dark` | 1280x866 | 19,683 | 0.0178 | [diffs/login-desktop-dark-diff.png](diffs/login-desktop-dark-diff.png) | **ACCEPTED** |
| 3 | `login-mobile-light` | 390x910 | 15,854 | 0.0447 | [diffs/login-mobile-light-diff.png](diffs/login-mobile-light-diff.png) | **ACCEPTED** |
| 4 | `login-mobile-dark` | 390x910 | 15,795 | 0.0445 | [diffs/login-mobile-dark-diff.png](diffs/login-mobile-dark-diff.png) | **ACCEPTED** |
| 5 | `signup-desktop-light` | 1280x938 | 19,504 | 0.0162 | [diffs/signup-desktop-light-diff.png](diffs/signup-desktop-light-diff.png) | **ACCEPTED** |
| 6 | `signup-desktop-dark` | 1280x938 | 19,430 | 0.0162 | [diffs/signup-desktop-dark-diff.png](diffs/signup-desktop-dark-diff.png) | **ACCEPTED** |
| 7 | `signup-mobile-light` | 390x962 | 15,616 | 0.0416 | [diffs/signup-mobile-light-diff.png](diffs/signup-mobile-light-diff.png) | **ACCEPTED** |
| 8 | `signup-mobile-dark` | 390x962 | 15,542 | 0.0414 | [diffs/signup-mobile-dark-diff.png](diffs/signup-mobile-dark-diff.png) | **ACCEPTED** |
| 9 | `google-callback-desktop-light` | 1280x866 | 19,742 | 0.0178 | [diffs/google-callback-desktop-light-diff.png](diffs/google-callback-desktop-light-diff.png) | **ACCEPTED** |
| 10 | `google-callback-desktop-dark` | 1280x866 | 19,683 | 0.0178 | [diffs/google-callback-desktop-dark-diff.png](diffs/google-callback-desktop-dark-diff.png) | **ACCEPTED** |
| 11 | `google-callback-mobile-light` | 390x910 | 15,854 | 0.0447 | [diffs/google-callback-mobile-light-diff.png](diffs/google-callback-mobile-light-diff.png) | **ACCEPTED** |
| 12 | `google-callback-mobile-dark` | 390x910 | 15,795 | 0.0445 | [diffs/google-callback-mobile-dark-diff.png](diffs/google-callback-mobile-dark-diff.png) | **ACCEPTED** |

### The recorded reason

This is the **login/signup restyle residual**, first recorded by Phase 3
sub-feature 1 (`STATE.md` deviation 3.1/9, `phase-3-subfeature-1-handoff.md`
§6) and re-measured unchanged at every phase boundary since — Phase 3's
consolidated verifier (8 of its 40 shots), the Phase 5 integrator, and Phase 6
(68/80, "the same 12 … unchanged"). It is **not** a port defect. Both changes
are deliberate `DESIGN.md` decisions — rule 4 (the brass CTA fill) and rollout
step 3 (`font-display` on headings) — that Phase 2 shipped and Phase 2's
verifier signed off. The baselines predate them: they were captured from React
in Phase 0, before either restyle existed. So React and Angular differ here
because **the design changed**, not because the port drifted.

Phase 3.1 measured it both ways: with the two Phase-2 restyles backed out, all
12 shots pass. They were not backed out, because relitigating a signed-off
Phase-2 design decision was not that slice's call — and it is not this one's
either.

**Localised numerically, not just asserted.** A per-row diff profile of
`login-desktop-light` (the whole 19,742-pixel delta) resolves into four
contiguous bands:

| Rows | Differing px | Share | What is there |
| ---- | ------------ | ----- | ------------- |
| y 542–585 | 17,219 | 87.2% | the "Sign In" CTA — a 44px-tall solid fill, brass vs the baseline's colour |
| y 300–323 | 2,423 | 12.3% | the "Welcome to Tremolo" heading — `font-display` vs `font-sans` |
| y 23–36 | 67 | 0.3% | nav icon antialiasing (see below) |
| y 495–502 | 30 | 0.2% | the password field's show/hide eye glyph, antialiasing |
| y 38–39 | 3 | 0.0% | nav rule, antialiasing |

**99.5% of the delta is the CTA fill plus the heading typeface** — exactly the
two changes on the record. The diff images show the same thing by eye: a solid
red button block, a ghosted double-struck heading, and white everywhere else.

`google-callback` is byte-for-byte identical to `login` at every viewport and
theme (19,742 / 19,683 / 15,854 / 15,795 — the same four numbers) because the
route redirects to `/login` when it has no OAuth code. It is the same page,
photographed twice.

**Nav antialiasing is sub-threshold and universal.** The nav band (top 64px)
of `login-mobile-dark` differs by **72 pixels of 24,960 — ratio 0.0029**,
against a 0.01 threshold, while the body below it carries 15,723 of the 15,795
(99.5%). The same nav renders on all 80 shots and 68 of them pass, so it is
antialiasing noise, not a regression. Recorded here so it is not mistaken for
one on the next reading.

### Anything OPEN

**None.** The set of over-threshold shots is exactly the 12 already on the
record, and nothing outside it moved. No new diff was found, so nothing had to
be investigated, fixed, or newly accepted.

## 3. How to reproduce

```bash
export NVM_DIR="$HOME/.config/nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
cd frontend && npm run dev -- --port 4300          # both backends must be up

E2E_BASE_URL=http://localhost:4300 npx playwright test --project=golden
E2E_BASE_URL=http://localhost:4300 npm run e2e:baselines
```

`npm run e2e:baselines` aborts each pass at its first failing shot, which on
this branch is `/login`. To see all 80, copy `baselines.spec.ts`, change its
one `expect(page).toHaveScreenshot` to `expect.soft(page).toHaveScreenshot`,
and run the copy — that is what this report did.

---

## Sign-off

The 12 diffs above are **accepted by the migration record**, not by any agent:
each traces to a `DESIGN.md` decision that a human signed off in Phase 2, and
each has been re-measured unchanged at four phase boundaries. No agent has
approved a visual regression, and none is claimed here.

**Awaiting human review: 12 accepted diffs**
