# Migration ledger

**The only place phase status lives.** Update it as part of the phase's commit.

Status values: `pending` → `built` (builder finished, Verify green) → `done`
(a separate verifier agent confirmed Exit criteria). `blocked` if stopped.

| Phase | Name                       | Status  | Date | Commits | Notes |
| ----- | -------------------------- | ------- | ---- | ------- | ----- |
| 0     | Scaffold + parity harness  | pending | —    | —       |       |
| 1     | Core plumbing              | pending | —    | —       |       |
| 2     | Shared UI kit              | pending | —    | —       |       |
| 3     | CRUD features              | pending | —    | —       |       |
| 4     | Sheet music / OSMD         | pending | —    | —       |       |
| 5     | Identification-game engine | pending | —    | —       |       |
| 6     | Note game                  | pending | —    | —       |       |
| 7     | Cutover                    | pending | —    | —       |       |

---

## Deferred decisions

Recorded here when made, so later phases and future readers can find them.

| Decision                           | Phase | Choice      | Rationale |
| ---------------------------------- | ----- | ----------- | --------- |
| Chart library (replaces recharts)  | 3     | _undecided_ |           |
| Audio library (replaces use-sound) | 6     | _undecided_ |           |

---

## Deviations

Anything where the repo contradicted the plan (R5), or a packet instruction
could not be followed as written. One row per deviation.

| Phase | What the plan said | What was actually done | Why |
| ----- | ------------------ | ---------------------- | --- |
| —     | —                  | —                      | —   |

---

## Environment notes

- **Node:** Angular 22 requires `^22.22.3 || ^24.15.0 || >=26.0.0`. This
  machine's system Node is **v25.9.0, which satisfies none of those ranges.**
  Phase 0 must pin a supported version (`nvm install 24 && nvm use 24`) and
  commit a `.nvmrc`. Verify with `node --version` before any `ng` command.
- Local dev needs both backends running for integration/E2E work:
  Go on :5001, Python on :8000. See root `README.md` for env vars.
