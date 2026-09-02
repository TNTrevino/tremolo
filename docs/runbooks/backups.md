# Postgres backups

Nightly `pg_dump`, kept locally on the app host, plus (your choice, see
below) a copy shipped off-machine. A backup that has never been restored
is a hope, not a backup -- the restore drill at the bottom is not optional.

## What's here

- `scripts/backup/tremolo-backup.sh` -- dumps the database (custom format,
  `pg_dump -Fc`) to `/var/backups/tremolo/tremolo-<timestamp>.dump`, then
  prunes anything older than 14 days (override with
  `TREMOLO_BACKUP_RETENTION_DAYS`). Reads `PGURL`, or failing that
  `DATABASE_URL`, from `/etc/tremolo/.env` by default.
- `scripts/backup/tremolo-backup.service` / `.timer` -- a systemd oneshot
  service triggered daily (± up to 30 min, `RandomizedDelaySec`) by the
  timer, not enabled on its own.

None of this is deployed by `.github/workflows/deploy.yml` -- that workflow
only ships the `core-api` binary and rsyncs `music-api`/the frontend build.
Backup tooling is host setup, done once, not part of the app release.

## Install (once per host: prod, and qa if you want it backed up too)

```bash
# Copy the script and units to the host. From a machine with the repo
# checked out, e.g.:
scp scripts/backup/tremolo-backup.sh   <host>:/opt/tremolo/scripts/backup/
scp scripts/backup/tremolo-backup.service <host>:/tmp/
scp scripts/backup/tremolo-backup.timer   <host>:/tmp/

# On the host:
sudo mkdir -p /opt/tremolo/scripts/backup
sudo chmod +x /opt/tremolo/scripts/backup/tremolo-backup.sh
sudo mv /tmp/tremolo-backup.service /tmp/tremolo-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now tremolo-backup.timer
```

Verify it's scheduled and run one backup immediately rather than waiting
for the timer:

```bash
systemctl list-timers tremolo-backup.timer
sudo systemctl start tremolo-backup.service   # runs one backup right now
journalctl -u tremolo-backup.service -n 50 --no-pager
ls -lh /var/backups/tremolo/
```

## Off-machine copy: your call

The script only writes to local disk (`/var/backups/tremolo/` on the app
host itself) -- a disk failure on that host loses the dumps along with
everything else. Getting a copy off-machine is a deliberate decision left
to you, not automated here, since it needs credentials and a destination
this repo has no business holding an opinion on. Two reasonable options:

- **rclone** (supports B2, S3, Drive, and most everything else): configure
  a remote once (`rclone config`), then add a line to the end of
  `tremolo-backup.sh` (or a small wrapper script/second timer) such as
  `rclone copy "$dest" remote:tremolo-backups/`.
- **rsync/scp to a second machine you control**: simplest if you already
  have one, e.g. `rsync -a /var/backups/tremolo/ otherhost:/backups/tremolo/`
  from a cron job or a second small timer on a schedule offset from this one.

Either way, point it at `$BACKUP_DIR` (`/var/backups/tremolo` by default)
and keep it independent of this timer's failure mode -- if the dump itself
fails, you want that alertable on its own (see `docs/runbooks/monitoring.md`
for the `OnFailure=` hook), not silently skipped by an off-machine copy step
that never got a file to copy.

## Restore drill

Do this once right after the first backup exists, and again periodically
(e.g. whenever this script or the Postgres major version changes) --
restoring into a scratch database, never over the real one:

```bash
createdb tremolo_restore_test
pg_restore --dbname=tremolo_restore_test --clean --if-exists \
  /var/backups/tremolo/tremolo-<timestamp>.dump

# Sanity-check it actually has real data, not an empty schema:
psql tremolo_restore_test -c "select count(*) from tremolo.users;"
psql tremolo_restore_test -c "select count(*) from tremolo.note_game_entries;"

dropdb tremolo_restore_test
```

If this drill fails or the counts look wrong, the backup is not doing its
job -- fix that before trusting the timer to run unattended.

**A version-skew warning is not the same as a failed drill.** Running this
drill while writing this doc, `pg_restore` 18.6 against a Postgres 16
server produced `pg_restore: warning: errors ignored on restore: 1` /
`unrecognized configuration parameter "transaction_timeout"` -- a newer
client emitting a directive an older server doesn't know. The restore
still completed and the data was intact (row counts matched). Prefer
`pg_dump`/`pg_restore` from the same major version as the server you're
backing up when you can, but a warning like this one, with correct row
counts after, is not a reason to distrust the backup.

## Actually restoring prod (not a drill)

Same `pg_restore` command, but against the real database, and only after
stopping `tremolo-api` and `tremolo-music` first (both hold connections and
would otherwise fight the restore). See the ROLLBACK section of
`docs/runbooks/prod-cutover.md` -- a database restore is explicitly the
**last resort** there, after a code-only rollback, since it loses every
write made since the dump was taken.
