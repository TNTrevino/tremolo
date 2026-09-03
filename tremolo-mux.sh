#!/usr/bin/env bash
#
# Start the whole tremolo stack in a herdr workspace.
#
# herdr model vs tmux:   session -> workspace,  window -> tab,  send-keys -> pane run.
# herdr is a client/server multiplexer, so this script drives the running server
# over its socket API. Start the server first with a bare `herdr` if it is down.

set -euo pipefail

SESSION="tremolo"
ROOT="$(cd "$(dirname "$0")" && pwd)"

if ! herdr status server 2>/dev/null | grep -q 'status: running'; then
  echo "Error: no herdr server is running. Start one with: herdr" >&2
  exit 1
fi

# Replace an existing tremolo workspace, the way `tmux kill-session` did.
EXISTING=$(herdr workspace list |
  jq -r --arg l "$SESSION" '.result.workspaces[] | select(.label == $l) | .workspace_id')
if [ -n "$EXISTING" ]; then
  herdr workspace close "$EXISTING" >/dev/null
fi

# Creating the workspace also creates its first tab and root pane.
WS_JSON=$(herdr workspace create --cwd "$ROOT" --label "$SESSION" --no-focus)
WS=$(jq -r '.result.workspace.workspace_id' <<<"$WS_JSON")
EDITOR_TAB=$(jq -r '.result.tab.tab_id' <<<"$WS_JSON")
EDITOR_PANE=$(jq -r '.result.root_pane.pane_id' <<<"$WS_JSON")

# new_tab <label> <cwd> <command>
new_tab() {
  local pane
  pane=$(herdr tab create --workspace "$WS" --cwd "$2" --label "$1" --no-focus |
    jq -r '.result.root_pane.pane_id')
  herdr pane run "$pane" "$3"
}

herdr tab rename "$EDITOR_TAB" editor >/dev/null
herdr pane run "$EDITOR_PANE" "nvim"

new_tab claude "$ROOT" "claude"
new_tab go "$ROOT/core-api" "source $ROOT/tremolo.sh && trem air main.go"
new_tab python "$ROOT/music-api" "source $ROOT/tremolo.sh && { [ -d env ] || { python -m venv env && env/bin/pip install -q -r requirements.txt; }; } && source env/bin/activate && trem fastapi dev main.py"
new_tab frontend "$ROOT/frontend" "source $ROOT/tremolo.sh && trem npm run dev"

herdr tab focus "$EDITOR_TAB" >/dev/null
herdr workspace focus "$WS" >/dev/null

# Already inside a herdr pane? The workspace is up, nothing left to attach.
if [ "${HERDR_ENV:-}" != 1 ]; then
  exec herdr
fi
