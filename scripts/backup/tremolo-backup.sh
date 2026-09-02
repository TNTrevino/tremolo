#!/usr/bin/env bash
# Nightly Postgres backup for Tremolo (issue #256).
#
# Not deployed by .github/workflows/deploy.yml -- that workflow only ships
# the core-api binary and rsyncs music-api/frontend build output. Copy this
# file to the host once by hand (see docs/runbooks/backups.md) and install
# it alongside tremolo-backup.service/.timer.
#
# Reads the database connection string from an env file (PGURL if set
# there, else DATABASE_URL -- the same variable core-api already requires,
# so a working /etc/tremolo/.env needs nothing added for this script to run)
# and pg_dumps in custom format (-Fc): compressed, and the only format
# pg_restore can selectively restore from or parallelize.
#
# set -euo pipefail: any failing step (missing env file content, pg_dump
# erroring, a full disk on mv) exits non-zero, which is what lets the
# systemd unit and journalctl show this as a failed run instead of a
# silent no-op.
set -euo pipefail

BACKUP_DIR="${TREMOLO_BACKUP_DIR:-/var/backups/tremolo}"
RETENTION_DAYS="${TREMOLO_BACKUP_RETENTION_DAYS:-14}"
ENV_FILE="${TREMOLO_BACKUP_ENV_FILE:-/etc/tremolo/.env}"

if [ -f "$ENV_FILE" ]; then
	set -a
	# shellcheck disable=SC1090
	source "$ENV_FILE"
	set +a
fi

PGURL="${PGURL:-${DATABASE_URL:-}}"
if [ -z "$PGURL" ]; then
	echo "tremolo-backup: no PGURL or DATABASE_URL found (checked \$TREMOLO_BACKUP_ENV_FILE=$ENV_FILE)" >&2
	exit 1
fi

mkdir -p "$BACKUP_DIR"

timestamp="$(date +%Y%m%d-%H%M)"
dest="$BACKUP_DIR/tremolo-${timestamp}.dump"
tmp="${dest}.in-progress"

# Dump to a .in-progress name first, then rename into place. A prune or a
# restore that ran mid-dump would otherwise see a truncated file with a
# "real" name and no way to tell it apart from a good one.
echo "tremolo-backup: dumping to $dest"
pg_dump --format=custom --file="$tmp" "$PGURL"
mv "$tmp" "$dest"
echo "tremolo-backup: wrote $dest ($(du -h "$dest" | cut -f1))"

echo "tremolo-backup: pruning dumps older than ${RETENTION_DAYS} days in $BACKUP_DIR"
find "$BACKUP_DIR" -maxdepth 1 -name 'tremolo-*.dump' -mtime "+${RETENTION_DAYS}" -print -delete

echo "tremolo-backup: done"
