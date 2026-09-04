#!/usr/bin/env bash
set -euo pipefail

if [ "${HERDR_ENV:-}" != "1" ]; then
	echo "This script must run inside a Herdr session." >&2
	exit 1
fi

ROOT="$(cd "$(dirname "$0")" && pwd)"
LABEL="tremolo"

existing_id="$(herdr workspace list | jq -r --arg label "$LABEL" '.result.workspaces[]? | select(.label == $label) | .workspace_id' | head -n1)"
if [ -n "$existing_id" ]; then
	herdr workspace close "$existing_id"
fi

ws="$(herdr workspace create --cwd "$ROOT" --label "$LABEL" --no-focus)"
workspace_id="$(jq -r '.result.workspace.workspace_id' <<<"$ws")"
editor_tab_id="$(jq -r '.result.tab.tab_id' <<<"$ws")"
editor_pane_id="$(jq -r '.result.root_pane.pane_id' <<<"$ws")"
herdr tab rename "$editor_tab_id" "editor"
herdr pane rename "$editor_pane_id" "editor"
herdr pane run "$editor_pane_id" "nvim"

claude_tab="$(herdr tab create --workspace "$workspace_id" --cwd "$ROOT" --label "claude" --no-focus)"
claude_pane_id="$(jq -r '.result.root_pane.pane_id' <<<"$claude_tab")"
herdr pane rename "$claude_pane_id" "claude"
herdr pane run "$claude_pane_id" "claude"

go_tab="$(herdr tab create --workspace "$workspace_id" --cwd "$ROOT/core-api" --label "go" --no-focus)"
go_pane_id="$(jq -r '.result.root_pane.pane_id' <<<"$go_tab")"
herdr pane rename "$go_pane_id" "go"
herdr pane run "$go_pane_id" "source $ROOT/tremolo.sh && trem air main.go"

python_tab="$(herdr tab create --workspace "$workspace_id" --cwd "$ROOT/music-api" --label "python" --no-focus)"
python_pane_id="$(jq -r '.result.root_pane.pane_id' <<<"$python_tab")"
herdr pane rename "$python_pane_id" "python"
herdr pane run "$python_pane_id" "source $ROOT/tremolo.sh && { [ -d env ] || { python -m venv env && env/bin/pip install -q -r requirements.txt; }; } && source env/bin/activate && trem fastapi dev main.py"

frontend_tab="$(herdr tab create --workspace "$workspace_id" --cwd "$ROOT/frontend" --label "frontend" --no-focus)"
frontend_pane_id="$(jq -r '.result.root_pane.pane_id' <<<"$frontend_tab")"
herdr pane rename "$frontend_pane_id" "frontend"
herdr pane run "$frontend_pane_id" "source $ROOT/tremolo.sh && trem npm run dev"

herdr tab focus "$editor_tab_id"
herdr workspace focus "$workspace_id"
