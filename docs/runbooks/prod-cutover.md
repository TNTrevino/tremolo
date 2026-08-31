# Prod cutover runbook

Rehearsal-first. Every step below runs on `qa` before it runs on `prod`. If a
step needs an operator judgment call under pressure, that call gets made
once, calmly, during the rehearsal -- not for the first time during the
real thing.

## Why this cutover is bigger than a normal deploy

As of this writing, `origin/prod` and `origin/qa` are both frozen at the
same commit (`b2a52b7`, 2026-07-14) -- **262 commits behind `main`**. That
gap is not just feature drift. Diffing the two trees shows prod is still on
the pre-reorg layout entirely: `backend/main/` instead of `core-api/`,
`.githooks/` instead of `.husky/`, the old `backend-go.yml` /
`music-microservice.yml` workflow names, and (per the frontend migration
record) the deleted React app instead of the Angular one. This cutover is a
full repo-layout and framework swap, not an incremental release.

The good news, verified before writing this runbook rather than assumed:

```
git merge-base origin/main origin/prod   # -> b2a52b7...
git diff b2a52b7... origin/prod --stat   # -> empty
git merge-base origin/main origin/qa     # -> b2a52b7... (same commit)
git diff b2a52b7... origin/qa --stat     # -> empty
```

Both `prod` and `qa` are exactly that old commit's tree, reached via merge
commits instead of fast-forwards -- there is **no unique, un-merged work on
either branch** to lose. (`git rev-list origin/main..origin/prod` reports
12 "commits", but every one is a `Merge pull request .../main` or `.../qa`
bookkeeping commit from a past promotion, which the empty tree diff above
confirms carries no content of its own.) That is what makes the force-push
in the Cutover steps below safe -- re-verify it with the same three commands
before you rely on it again, in case new commits have landed on `prod`/`qa`
directly since this was written.

## Preconditions

Confirm all of these before touching `qa`, let alone `prod`:

- [ ] Every PR in the Go-Live stack this epic depends on is merged to `main`.
- [ ] `main`'s required CI gate (`.github/workflows/ci.yml`) is green at the
      commit you're about to promote.
- [ ] `/etc/tremolo/.env` on **both** the geekom (prod) and pi (qa) hosts has
      every variable `core-api/README.md` and `music-api/README.md` mark
      required, plus the deploy-time `VITE_*` trio (`VITE_BACKEND_MAIN`,
      `VITE_BACKEND_MUSIC`, `VITE_GOOGLE_CLIENT_ID` -- `deploy.yml` hard-fails
      the build if any is unset). If the email-service/verification stack
      has merged to `main` by the time you read this, that also means
      `EMAIL_*` vars -- check `music-api/README.md` / `core-api/README.md`
      for the current names and confirm they're set too. If it hasn't merged
      yet, there's nothing to check here yet.
- [ ] A fresh `pg_dump` of **prod's** database exists off-box (see
      `docs/runbooks/backups.md`) and is dated today, not from whenever the
      timer last happened to fire.
- [ ] Prod's database migration state is known, not assumed. SSH in and run:
      `psql "$DATABASE_URL" -c "select * from goose_db_version order by version_id desc limit 5;"`
      If that table doesn't exist, `goose` has never run against this
      database -- the first deploy will attempt migrations `00001` onward
      from scratch, against a schema that predates the sqlc/goose reorg.
      Confirm there's no naming collision first (`\dn`, `\dt tremolo.*` --
      the old layout may not even use a `tremolo` schema). This is the
      single biggest unknown in this whole runbook and the reason the DB
      backup above is not optional.
- [ ] You have a named, pushable ref for "prod as it is right now", for
      rollback (see below) -- don't rely on remembering a raw SHA under
      incident pressure:
      `git tag pre-cutover-prod-$(date +%Y%m%d) origin/prod && git push origin pre-cutover-prod-$(date +%Y%m%d)`

## Rehearsal (on `qa`, i.e. the pi)

1. Point `qa` at `main`'s tip. Since `qa`'s history isn't an ancestor of
   `main` (see "Why this cutover is bigger" above), a plain
   `git push origin main:qa` is rejected as a non-fast-forward. Re-run the
   two verification commands from that section against `qa` immediately
   before doing this, then:
   ```
   git push --force origin main:qa
   ```
   This triggers `.github/workflows/deploy-test.yml` -> `deploy.yml` with
   `runner: pi`, `frontend-dest: reverse-proxy:/var/www/tremolo-test/`.
2. Watch the run (`gh run watch` or the Actions tab). `deploy.yml`'s own
   last step already curls `/health` and `/music/health` on the pi itself --
   a red run here means don't go near prod yet.
3. Run the kulala smoke suite against the pi. `core-api/apitests/http-client.env.json`
   only defines a `local` environment today, so either tunnel it
   (`ssh -L 5001:localhost:5001 <qa-host>`, then `make test-api` unmodified)
   or add a `qa` entry pointing at the pi's real address -- worth doing
   properly once, since this same gap will recur every rehearsal otherwise.
4. Click through by hand against the pi's public QA URL: sign up a fresh
   student, play a game and save a score, sign up (or log in as) a teacher,
   create a class, view the roster/chart. This is the same golden path
   `frontend/e2e/` automates -- if `.github/workflows/e2e.yml` has been
   promoted off `workflow_dispatch`-only by the time you read this, that
   suite can stand in for part of this step, but it does not replace looking
   at the rendered pages with your own eyes at least once.
5. If the email-service/verification stack has merged (`EMAIL_*` vars are
   set on the pi): trigger a verification or password-reset email through
   the UI and confirm it actually arrives, rather than sitting in an
   unsent queue. Skip this step entirely if those vars aren't set yet.
6. Only proceed to prod once the rehearsal above is clean. If anything was
   red, fix it on `main`, merge, and re-rehearse -- don't patch `qa`
   directly (that's exactly how prod and qa ended up frozen and divergent
   from `main` in the first place).

## Cutover (on `prod`, i.e. geekom)

1. Re-verify prod's tree is still exactly the old, safe-to-discard state
   (the two commands from "Why this cutover is bigger" above) -- if anyone
   deployed a hotfix directly to `prod` since you last checked, stop and
   reconcile it into `main` first.
2. Tag prod's current tip for rollback if you haven't already (see
   Preconditions).
3. ```
   git push --force origin main:prod
   ```
   This triggers `deploy-prod.yml` -> `deploy.yml` with `runner: geekom`,
   `frontend-dest: reverse-proxy:/var/www/tremolo/`. `deploy.yml`'s
   `concurrency` group (`deploy-geekom`) means this cannot race a second
   deploy to the same target -- it queues instead.
4. Watch the run to completion. Migrations run automatically as part of
   the Go binary starting (`database.RunMigrations` in `core-api/main.go`)
   -- there is no separate migrate step to trigger.

## Verification checklist (on prod, after the workflow finishes)

- [ ] `curl -f https://api.tremolonotes.com/health` -- 200, and the body's
      `checks.database` says `"connected"`, not just an HTTP 200 (see
      `docs/runbooks/monitoring.md` for why a proxy-level stub would lie
      about this).
- [ ] `curl -f https://api.tremolonotes.com/music/health` -- 200.
- [ ] `https://tremolonotes.com` renders the **Angular** app (check the
      page source or a distinctive Angular-only route) -- confirming the
      static swap actually took, not a cached old bundle from the CDN/proxy.
- [ ] Log in with a real (or throwaway) account; save a game score; a
      teacher account can view its class chart.
- [ ] `/privacy`, `/terms`, `/pricing` all render.
- [ ] `journalctl -u tremolo-api -n 100 --no-pager` and the equivalent for
      `tremolo-music` show no repeating errors in the first few minutes.

## Rollback

Migrations are additive-only, which is what makes a **code-only** rollback
safe without also touching the database. Verified at the time of writing
(re-run this check before you rely on it, since more migrations may exist
by cutover time -- `ls core-api/database/migrations/` and re-grep):

```
grep -n -i "drop\|+goose Down" core-api/database/migrations/*.sql
```

As of this writing there are 10 migrations (`00001`-`00010`). Every `drop`
in every file falls after that file's own `-- +goose Down` marker -- i.e.
Down-only, never run automatically -- with one deliberate exception:
`00003_role_lookup_table.sql` drops the legacy `users.role` varchar column
in its Up section, but only after backfilling every row's value into the
new `role_id` foreign key first (expand-migrate-contract), so no
information is lost. None of the ten drops a table or column that still
holds live data.

Because of that, rolling back is "redeploy the old code", not "restore the
database":

1. Find the tag you made in Preconditions (`pre-cutover-prod-YYYYMMDD`), or
   `git rev-parse origin/prod` from before you force-pushed if you forgot.
2. Redeploy it through the same, ordinary path -- not a special break-glass
   procedure -- by dispatching the workflow against that ref:
   ```
   gh workflow run deploy-prod.yml --repo TNTrevino/tremolo --ref pre-cutover-prod-YYYYMMDD
   ```
   This re-runs the full `frontend-ci`/`go-ci`/`music-ci` gate and `deploy.yml`
   against the old commit, so it is **not instant** -- expect the same
   wall-clock time as a normal deploy, not a snap-back. `deploy.yml`
   overwrites `/opt/tremolo` and the frontend dest in place with no kept
   previous artifact (that gap is tracked separately -- see #255's own task
   list -- this runbook documents the rollback *procedure* available today,
   which is a full redeploy of the old ref, not a from-scratch feature to
   build tonight).
3. DB restore from the `pg_dump` (`docs/runbooks/backups.md`) is the
   **last resort** -- only if data was actually corrupted, never as the
   first response to "the new code behaves badly". Restoring loses every
   write since the dump was taken.

---

Prod is 258+ commits behind `main` and still serving the deleted React app.
That's not a caveat for this runbook -- it's the reason it exists. The
cutover above is the fix.
