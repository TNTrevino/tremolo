# Tremolo Design System — "Ink, Paper & Brass"

This document is the source of truth for Tremolo's visual direction. It
replaces the earlier purple "neo-brutalist" theme. When a component and
this document disagree, the component is wrong.

## Why the redesign

The previous theme used one saturated purple for every job: brand mark,
primary action, selected state, active nav, answer buttons, login. When
everything is the accent, nothing is — and saturated violet on white
with a default sans is the most recognizable "AI-generated app"
fingerprint there is. The references we're steering toward instead:

- **My Music Staff** — navy foundation, warm yellow spent on exactly
  one CTA per screen, friendly without being childish.
- **musictheory.net** — near-monochrome, content-first; color appears
  almost exclusively as _feedback_.

The common thread: a neutral ink does the everyday work, and the warm
accent is scarce enough to mean something.

## Direction

Ground the palette in the subject's own material. Engraved notation is
**ink on paper**; the reward color of a school music room is **brass**.

- **Ink** (deep navy): text, primary buttons, selected chips, active
  nav. Navy instead of black keeps it friendly for 6th–12th graders.
- **Paper** (warm near-white): backgrounds. The staff must always be
  the highest-contrast element on a game page.
- **Brass** (warm amber): THE accent. Primary CTA, scores/streaks,
  focus rings. If brass appears more than ~twice on a screen, remove
  one.
- **Feedback pair** (green/red): correct/incorrect only. Feedback color
  is never used decoratively, so when it appears it carries meaning.
- Purple is retired everywhere, including the logo chip.

## Tokens

Semantic tokens live in `src/styles.scss` as shadcn-style HSL variables.
Two token changes beyond re-valuing:

1. `--accent` returns to its shadcn meaning: a **quiet hover/selected
   surface** (neutral), because nav and menus use `hover:bg-accent`.
2. A new `--brass` token carries the brand accent (charts, stat
   highlights, CTA). Never use `--accent` for emphasis and never use
   `--brass` as a hover wash.
3. A new `--correct` token joins `--destructive` for answer feedback.

### Light ("paper")

| Token                  | HSL                             | Role                        |
| ---------------------- | ------------------------------- | --------------------------- |
| `--background`         | `40 20% 98%`                    | paper                       |
| `--foreground`         | `222 39% 16%`                   | ink text                    |
| `--card` / `--popover` | `0 0% 100%`                     | raised paper                |
| `--primary`            | `222 39% 20%`                   | ink actions, selected chips |
| `--primary-foreground` | `40 20% 98%`                    |                             |
| `--secondary`          | `222 15% 93%`                   | quiet fills                 |
| `--muted`              | `40 12% 93%` / fg `222 12% 42%` |                             |
| `--accent`             | `222 18% 92%`                   | hover wash (menus, nav)     |
| `--brass`              | `36 68% 46%` / fg `40 20% 98%`  | THE accent                  |
| `--correct`            | `152 55% 32%` / fg `40 20% 98%` | right answers               |
| `--destructive`        | `0 72% 45%`                     | errors, wrong answers       |
| `--border` / `--input` | `222 15% 86%`                   |                             |
| `--ring`               | `36 68% 42%`                    | brass focus ring            |
| `--radius`             | `0.5rem` (unchanged)            |                             |

### Dark ("charcoal")

Charcoal like musictheory.net — neutral and warm-tinted, **not**
purple-tinted.

| Token                     | HSL                                               |
| ------------------------- | ------------------------------------------------- |
| `--background`            | `220 8% 10%`                                      |
| `--foreground`            | `40 15% 92%`                                      |
| `--card` / `--popover`    | `220 8% 14%`                                      |
| `--primary`               | `40 15% 92%` (light fill, dark text `220 8% 12%`) |
| `--secondary` / `--muted` | `220 6% 18%` / fg `220 5% 64%`                    |
| `--accent`                | `220 6% 20%`                                      |
| `--brass`                 | `36 70% 55%` / fg `220 8% 10%`                    |
| `--correct`               | `152 45% 45%`                                     |
| `--destructive`           | `0 60% 50%`                                       |
| `--border` / `--input`    | `220 6% 22%`                                      |
| `--ring`                  | `36 70% 55%`                                      |

Selected chips in dark mode are light fills on charcoal — the same
figure/ground flip musictheory.net's keyboard uses.

## Typography

- **Display** (`font-display`): **Bricolage Grotesque** — headings,
  game titles, hero, big stats. Characterful without being a toy.
- **Body** (`font-sans`): **Inter** — everything else. Inter is fine as
  a body face once the display face carries the personality.
- Both are self-hosted via `@fontsource-variable/*` packages, loaded via
  `@use` at the top of `src/styles.scss` — never a Google Fonts `<link>` (no
  third-party request,
  versioned with the app). The old config _named_ fonts it never
  loaded; if a face isn't imported, don't list it.
- Timer, score, and NPM figures use `tabular-nums` so they don't jitter
  as digits change.

## Component rules

1. **Answer buttons are quiet.** Paper surface, 2px ink border, ink
   text (`outline` style). The staff is the loudest thing on a game
   page — answers never compete with the question. Correct/incorrect
   feedback (when wired) flashes `--correct`/`--destructive`; color
   arrives as _feedback_, not decoration.
2. **One shadow level.** Cards may carry a single soft shadow. Buttons
   carry none — borders do the work.
3. **Selected = ink fill.** Settings chips, nav active state, mode
   toggles: filled ink (light fill in dark mode). Never brass.
4. **Brass is scarce.** Login/primary CTA, the accuracy/NPM highlight,
   focus rings, chart emphasis. Nothing else.
5. **Hero = notation, not gradient.** Paper background, one-color ink
   headline set on faint engraved staff lines (the signature element),
   a single brass CTA. No gradient washes, no accent-colored half
   headlines.
6. **Logo chip** is ink with the paper glyph (brass in dark mode is
   acceptable); purple does not survive anywhere.

## Rollout

**Status: shipped.** All three steps are in the Angular app. Step 3 is the
one partial: `font-display` is on the HomePage hero and the auth card
titles, but not on every heading — the screenshot baselines were captured
from React before the restyle, and extending it costs a page its diff
threshold. That is a recorded, human-reviewed residual, not an oversight;
see `.migration/parity-report/`. The plan is kept below as the record of
what was decided and why.

Phased so each commit is visually reviewable:

1. **Tokens + fonts + quiet answers** — re-value `styles.scss`, add
   `--brass`/`--correct` + Tailwind mappings, load fonts, strip button
   shadows, convert AnswerPad/NoteButtonGrid to the quiet style,
   repoint chart/stat `accent` usages at `brass`.
2. **Chrome** — nav active states, Games menu, logo chip, settings
   chips (mostly free via tokens; audit `text-accent`/`bg-accent`).
3. **Hero + display type** — HomePage rebuild per rule 5; apply
   `font-display` to headings and big stats.

Known follow-ups: wire correct/incorrect flash into the answer flow;
eyeball OSMD dark-mode rendering against charcoal (it re-colors glyphs
via `darkMode`, verify contrast).
