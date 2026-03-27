#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

source "$SCRIPT_DIR/colors.sh"

green "Seeding database with fake data..."
go run "$REPO_DIR/backend/main/main.go" --fake-it
green "Done."
