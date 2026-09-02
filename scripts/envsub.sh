#!/usr/bin/env bash
#
# Fills the %TOKEN% placeholders in the Angular production environment file
# from the environment. Run from the repository root, before `npm run build`.
#
# Angular has no run-time environment lookup: a production build substitutes
# environment.prod.ts for environment.ts via angular.json's fileReplacements,
# and that is a source file, not a lookup. So the values have to be on disk
# before the build. deploy.yml sources /etc/tremolo/.env on the target
# machine and then runs this.
#
# Two guards, because there are two ways to get this wrong. A `:?` on each
# required variable catches a value missing from /etc/tremolo/.env. The
# leftover scan at the end catches the opposite -- a token in the TypeScript
# file that no line here substitutes, which would otherwise deploy the
# literal placeholder to every visitor.
#
# That scan is why every placeholder name carries the VITE_ prefix: it gives
# the scan something to match that ordinary prose in the file's doc comment
# does not. sed runs over the whole file, so a comment that spelled a token
# out would be rewritten too.
set -euo pipefail

TARGET=frontend/src/environments/environment.prod.ts

# sub TOKEN VALUE -- replaces every %TOKEN% in TARGET.
#
# The value is escaped for sed's replacement side. A backslash, an ampersand
# (sed expands it to the whole match) and the | delimiter would each corrupt
# the output otherwise.
sub() {
	local escaped
	escaped=$(printf '%s' "$2" | sed -e 's/[\\&|]/\\&/g')
	sed -i "s|%$1%|${escaped}|g" "$TARGET"
}

sub VITE_BACKEND_MAIN "${VITE_BACKEND_MAIN:?not set in /etc/tremolo/.env}"
sub VITE_BACKEND_MUSIC "${VITE_BACKEND_MUSIC:?not set in /etc/tremolo/.env}"
sub VITE_GOOGLE_CLIENT_ID "${VITE_GOOGLE_CLIENT_ID:?not set in /etc/tremolo/.env}"
sub VITE_APP_NAME "${VITE_APP_NAME:-Tremolo}"

if grep -nE '%VITE_[A-Z_]+%' "$TARGET"; then
	echo "envsub.sh: the placeholders above have no substitution" >&2
	exit 1
fi

echo "envsub.sh: wrote $TARGET"
echo "coreApi=${VITE_BACKEND_MAIN} musicApi=${VITE_BACKEND_MUSIC}"
