#!/usr/bin/env bash

# Tremolo Development Environment Tmux Startup Script
# This script creates a tmux session with all necessary services

set -e

SESSION_NAME="tremolo"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "Error: Tmux session '$SESSION_NAME' already exists."
  echo "Please attach to it with: tmux attach-session -t $SESSION_NAME"
  echo "Or kill it with: tmux kill-session -t $SESSION_NAME"
  exit 1
fi

# Check if we're inside a tmux session
INSIDE_TMUX=false
if [ -n "$TMUX" ]; then
  INSIDE_TMUX=true
fi

echo "Creating tmux session '$SESSION_NAME'..."

# nvim
tmux new-session -d -s "$SESSION_NAME" -n "editor" -c "$PROJECT_ROOT"
tmux send-keys -t "$SESSION_NAME:editor" "source ~/tremolo.sh && nvim" C-m

# opencode
tmux new-window -t "$SESSION_NAME" -n "opencode" -c "$PROJECT_ROOT"
tmux send-keys -t "$SESSION_NAME:opencode" "source ~/tremolo.sh && opencode" C-m

# go backend
tmux new-window -t "$SESSION_NAME" -n "main-backend" -c "$PROJECT_ROOT/backend/main"
tmux send-keys -t "$SESSION_NAME:main-backend" "source ~/tremolo.sh && air" C-m

# py backend
tmux new-window -t "$SESSION_NAME" -n "music-backend" -c "$PROJECT_ROOT/backend/music"
tmux send-keys -t "$SESSION_NAME:music-backend" "source ~/tremolo.sh && source env/bin/activate && fastapi dev main.py" C-m

# frontend
tmux new-window -t "$SESSION_NAME" -n "frontend" -c "$PROJECT_ROOT/frontend"
tmux send-keys -t "$SESSION_NAME:frontend" "source ~/tremolo.sh && npm run dev" C-m

# Select the editor window (window 1) as the default focus
tmux select-window -t "$SESSION_NAME:editor"

echo "Tmux session '$SESSION_NAME' created successfully!"

# Attach or switch based on whether we're already in tmux
if [ "$INSIDE_TMUX" = true ]; then
  echo "Switching to session '$SESSION_NAME'..."
  tmux switch-client -t "$SESSION_NAME"
else
  echo "Attaching to session '$SESSION_NAME'..."
  tmux attach-session -t "$SESSION_NAME"
fi
