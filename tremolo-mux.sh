#!/usr/bin/env bash

SESSION="tremolo"
ROOT="$(cd "$(dirname "$0")" && pwd)"

tmux has-session -t "$SESSION" 2>/dev/null && tmux kill-session -t "$SESSION"

tmux new-session -d -s "$SESSION" -n "editor" -c "$ROOT"
tmux send-keys -t "$SESSION:editor" "nvim" Enter

tmux new-window -t "$SESSION" -n "claude" -c "$ROOT"
tmux send-keys -t "$SESSION:claude" "claude" Enter

tmux new-window -t "$SESSION" -n "go" -c "$ROOT/backend/main"
tmux send-keys -t "$SESSION:go" "source $ROOT/tremolo.sh && trem air main.go" Enter

tmux new-window -t "$SESSION" -n "python" -c "$ROOT/backend/music"
tmux send-keys -t "$SESSION:python" "source $ROOT/tremolo.sh && { [ -d env ] || { python -m venv env && env/bin/pip install -q -r requirements.txt; }; } && source env/bin/activate && trem fastapi dev main.py" Enter

tmux new-window -t "$SESSION" -n "frontend" -c "$ROOT/frontend"
tmux send-keys -t "$SESSION:frontend" "source $ROOT/tremolo.sh && trem npm run dev" Enter

tmux select-window -t "$SESSION:editor"
tmux attach -t "$SESSION"
