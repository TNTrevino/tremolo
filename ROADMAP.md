# Tremolo Roadmap — from practice app to product

This document is the source of truth for *what we're building toward
and why*. It's a hypothesis, not a contract — revise it when real
teachers tell us something different. (Visual direction lives in
`frontend/DESIGN.md`; this doc is about product and money.)

## What Tremolo is today

A drill-practice app for school musicians (6th–12th grade):

- Five identification games — notes, key signatures, intervals,
  scales, chords — with scoring, timers, and per-user saved settings.
- A generated sight-reading page: music21 produces never-repeating
  exercises from a chosen scale, range, and rhythm pattern.
- Accounts, teacher/student + friend relationships, score history,
  and dashboards already exist in the Go backend.

Functionally: musictheory.net's exercises **plus two things it doesn't
have** — server-generated infinite exercises and persistent progress
tracking.

## Who pays (the core decision)

**Students don't pay for theory drills.** musictheory.net, Teoria, and
Tenuto made that market free or a $4 one-time purchase.

**Teachers and school programs pay.** Proof this exact business works:

- *Sight Reading Factory* — generated sight-reading, ~$35/yr per
  teacher + ~$2/student seat, sold into the Texas UIL band/choir/
  orchestra world our own copy already references.
- *uTheory*, *Breezin' Thru Theory* — same model for theory drills.

The backend already models the teacher/student relationship. We built
half of a B2B2C product; this doc makes that deliberate.

## The model

- **Free forever for individual students.** They're distribution —
  teachers assign what students already use and like.
- **Paid teacher/program tier.** Classes, assignments, progress
  reports, leaderboards. Pricing hypothesis: ~$40/yr per director,
  small per-student seat fee. Validate before wiring billing.

## Feature sequence (in order of leverage)

### 1. Classes and assignments — the reason a director pays

- Teacher creates a class; students join with a code.
- An assignment is a saved game config (already JSONB in
  `game_settings`) + a due date + a target (score/accuracy/count).
- Teacher sees a results grid per class per assignment.
- Missing pieces: rosters, assignments tables, teacher report views.
  Most primitives (game configs, score entries, teacher role) exist.

### 2. Deepen the sight-reading generator — the moat

The ID games are table stakes anyone can clone. "Infinite,
UIL-leveled sight-reading" is what Sight Reading Factory charges for,
and music21 gives it to us cheaply:

- Multi-measure exercises, difficulty ladders mapped to UIL
  sight-reading levels.
- Richer rhythm vocabulary; alto clef for orchestra programs.

### 3. Class leaderboards, streaks, feedback polish — retention

- Leaderboards within a class (kids compete; directors love that it
  makes practice self-motivating).
- Streaks and practice goals.
- Wire the correct/incorrect answer flash (`--correct` /
  `--destructive` tokens exist; see DESIGN.md follow-ups).

### 4. Billing schools can actually use

- Stripe for card-paying teachers.
- A "request a quote / invoice" path — many programs buy via purchase
  order, not credit card. This matters more than a slick checkout.

## Explicit non-goals (for now)

- Microphone pitch/rhythm assessment (SmartMusic's territory —
  enormous scope).
- Native mobile apps.
- Content-authoring tools — the generator *is* the content.

## Before building the paid tier: validate

Get five band/choir directors to look at the games and answer one
question: **"Would you assign this, and what's missing before you'd
pay ~$40/year for your program?"**

Their answer to "what's missing" replaces the sequence above. This
doc is the hypothesis; theirs is the market.
