# Uptime monitoring and error tracking

Today, observability is stdout logs captured by journald, and nothing else.
No external probe, no alerting, no error tracker. This doc states precisely
what exists, then a minimal, mostly-free setup to close the gap.

## What exists today (verified against the code, not assumed)

- **`GET /health`** (`core-api/controllers/health_controller.go`) -- pings
  the actual database connection (`database.DBConn.Ping()`), not just "the
  process is running". Returns `200 {"status":"healthy","checks":{"database":"connected"}}`
  or `503 {"status":"unhealthy","checks":{"database":"<error>"}}`. This is
  the same check `.github/workflows/deploy.yml` and `api-smoke.yml` already
  poll after every deploy.
- **`GET /music/health`** (`music-api/routers/api.py`) -- a different check,
  appropriate to a stateless service with no database: it constructs a
  `music21.note.Note("C4")` and reports `503` if that throws. Don't expect
  this one to say anything about Postgres; it can't.
- **Frontend crashes are caught, but invisible past the browser that hit
  them.** `GlobalErrorHandler` (`frontend/src/app/core/services/global-error.handler.ts`)
  is the app's one error boundary -- it catches anything that reaches
  Angular's `ErrorHandler` and shows an error toast. It logs through
  `LoggerService` (`frontend/src/app/core/services/logger.service.ts`),
  which is `console.*` and nothing else -- no remote transport. A
  production crash is invisible unless someone happens to have devtools
  open on their own machine at the time.
- **Backend panics are caught, logged locally, and nothing else.** The Go
  service's middleware chain runs `Recover` first (`core-api/README.md`'s
  architecture section), so a handler panic doesn't take the process down.
  It's logged via `logger/logger.go` (`log/slog`, defaulting to stdout),
  which systemd already captures into the journal for a unit it manages
  (`journalctl -u tremolo-api -f` already works, per
  `docs/self-hosting.md`'s troubleshooting section) -- but nothing pages
  anyone, and nothing aggregates it.
- **The reverse-proxy layer matters for how real this signal is, and today
  it defeats it.** The live Caddyfile answers `/health` with a hardcoded
  `respond "OK" 200` on all four service hosts, instead of forwarding to the
  Go service's real, DB-aware check. This is measured, not assumed: `curl
  https://api.tremolonotes.com/health` returns the plain string `OK`, while
  `core-api/controllers/health_controller.go` returns
  `{"status":"healthy","checks":{"database":"connected"}}`. Caddy sorts
  `handle` ahead of a bare `reverse_proxy`, so the stub wins and the proxy
  never sees the request. **An uptime monitor pointed at `/health` today
  only proves Caddy is up.** If Postgres dies it still answers 200 and
  nothing pages anyone. Fix it by deleting the `handle /health` block from
  each service block in `/etc/caddy/Caddyfile`; the bare `reverse_proxy`
  then carries `/health` through, the way it already carries
  `/music/health`. Deploys are unaffected either way -- `deploy.yml` curls
  each service directly on the app machine and never crosses the proxy.

## Recommended minimal setup

### External uptime checker

Either UptimeRobot or healthchecks.io has a free tier sufficient for this.
Monitor three URLs, each on its own check (so an alert names which one is
down):

- `https://tremolonotes.com` -- the frontend (Caddy serving static files).
- `https://api.tremolonotes.com/health` -- core-api, **only after the proxy
  fix above**. Until then this reflects Caddy alone, not the database.
- `https://music-api.tremolonotes.com/music/health` -- music-api. Note the
  host: `api.tremolonotes.com/music/health` returns 404, because
  `api.tremolonotes.com` proxies to core-api only. The two services are on
  separate hosts, matching `VITE_BACKEND_MAIN` and `VITE_BACKEND_MUSIC`.

5-minute intervals are plenty for a two-person-team, self-hosted app; both
services' free tiers support that. Alert to email at minimum.

### On-box alerting (catches a crash even if the box is still answering HTTP)

External checks miss "the service restarted three times in the last
hour but happened to be up when the checker polled." Two options, either
is fine, and they're not mutually exclusive:

- **`OnFailure=` unit directive.** Add `OnFailure=tremolo-alert@%n.service`
  to `tremolo-api.service`/`tremolo-music.service` (a drop-in via
  `systemctl edit tremolo-api`, so `systemd/tremolo-api.service` in this
  repo doesn't need to change), where `tremolo-alert@.service` is a small
  oneshot unit that curls a healthchecks.io "dead man's switch" URL or
  sends a webhook. Fires only on an actual unit failure, from the host
  itself, no polling interval to tune.
- **A cron job that curls localhost.** Simpler, coarser: a `*/5 * * * *`
  cron entry that curls `localhost:5001/health` and `localhost:8000/music/health`
  and pings a healthchecks.io check-in URL on success (healthchecks.io
  alerts you when a check-in is *late*, which is the same "dead man's
  switch" idea with cron doing the scheduling instead of systemd).

### Error tracking

- **Sentry** -- hosted free tier or self-hosted. Wire it into
  `GlobalErrorHandler.handleError` (frontend) alongside the existing
  toast/console logging, and into the Go `Recover` middleware (backend) so
  a panic reports there instead of only to the local journal. This is the
  only option here that gives per-error grouping, stack traces, and a
  searchable history.
- **The zero-cost floor: journald + logrotate discipline.** Logs already
  reach `journalctl -u tremolo-api` / `-u tremolo-music` today. Making that
  actually useful as a floor (not a replacement for Sentry, just cheaper
  and already half-true) needs three things, none of which exist yet:
  1. `LOG_LEVEL`/`LOG_FORMAT=json` set in `/etc/tremolo/.env` in production
     (already documented in the root `README.md`'s env block --
     confirm it's actually set, since an unset `LOG_FORMAT` defaults to
     the human-readable text handler, which is harder to grep reliably).
  2. A bound on journald's own disk use --
     `/etc/systemd/journald.conf.d/tremolo.conf` with `SystemMaxUse=` set
     to something concrete, or an unbounded journal is one more way to
     eventually fill the disk.
  3. Something that actually looks -- even a daily
     `journalctl -u tremolo-api --since yesterday -p err` piped to the same
     alerting channel as the uptime checker, so an ERROR-level log line
     doesn't require someone to remember to go look.

## What only you can do (accounts, choices, URLs)

This doc gets you to the point of knowing what to wire up; it can't do the
following, because they're either paid decisions or need your credentials:

- [ ] Create the UptimeRobot or healthchecks.io account, and decide which.
- [ ] Add the three URLs above as checks; point alerts at an email/phone
      you actually watch.
- [ ] Decide whether error tracking happens at all for v1, and if so,
      Sentry hosted vs. self-hosted vs. the journald floor alone.
- [ ] If Sentry: create the project, get the DSN, and wire the two
      integration points named above.
