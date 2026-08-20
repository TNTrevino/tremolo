# Angular Migration — control directory

This directory is the **single source of truth** for the React → Angular 22
migration. It exists so that agents executing the migration need no
conversation history: everything is here or in the repo.

## Files

| File                        | Purpose                                                             |
| --------------------------- | ------------------------------------------------------------------- |
| `PLAN.md`                   | Decisions, inventory, target layout, reference code patterns, risks |
| `STATE.md`                  | **The ledger.** One row per phase. The only place status lives.     |
| `PROMPT_TEMPLATE.md`        | Copy-paste prompts for builder and verifier agents                  |
| `phase-0.md` … `phase-7.md` | Self-contained work packets, one per phase                          |
| `baselines/`                | Screenshot baselines captured from the React app (Phase 0)          |
| `phase-N-handoff.md`        | Written by each builder when it finishes                            |

## How to run a phase

1. **Builder** — fresh session (`/clear` first). Paste the builder prompt from
   `PROMPT_TEMPLATE.md`, substituting the phase number. It reads `STATE.md`,
   checks preconditions, does the work, runs Verify, writes its handoff, and
   sets its ledger status to `built`.
2. **Verifier** — another fresh session (`/clear` again). Paste the verifier
   prompt. It runs the Exit criteria and is the **only** thing allowed to set a
   phase to `done`.
3. Repeat for the next phase.

**Never let one session span two phases.** A fresh context reading committed
files is the entire design — see `PLAN.md` §1.

## Non-negotiables

- The repo is the only memory. If something you need isn't in these files or
  the code, that's a plan bug — record it in `STATE.md` and stop. Don't guess.
- If the repo contradicts a packet, **the repo wins**. Record the deviation in
  your handoff; don't silently "correct" the plan's expectations.
- Work only inside `frontend/`. The Go and Python services are out of scope.
