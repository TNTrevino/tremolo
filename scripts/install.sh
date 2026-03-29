#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

source "$SCRIPT_DIR/colors.sh"

if [ "$EUID" -ne 0 ]; then
	red "Run as root: sudo $0"
	exit 1
fi

green "Creating application directories..."
mkdir -p /opt/tremolo/backend/main
mkdir -p /opt/tremolo/backend/music

green "Setting up environment config..."
mkdir -p /etc/tremolo
if [ ! -f /etc/tremolo/.env ]; then
	cp "$REPO_DIR/.env.example" /etc/tremolo/.env
	chmod 644 /etc/tremolo/.env
	dim "Copied .env.example to /etc/tremolo/.env (edit with real values before starting services)"
else
	dim "/etc/tremolo/.env already exists, skipping"
fi

green "Installing systemd services..."
cp "$REPO_DIR/systemd/tremolo-api.service" /etc/systemd/system/
cp "$REPO_DIR/systemd/tremolo-music.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable tremolo-api
systemctl enable tremolo-music

echo ""
echo "---------------------------------------------------------"
echo ""

green "Service status:"
systemctl status tremolo-api --no-pager || true
echo ""
systemctl status tremolo-music --no-pager || true
echo ""

green "Installation complete!"
echo ""
echo "---------------------------------------------------------"
echo ""
bold "Next steps:"
echo "  1. Edit /etc/tremolo/.env with your production values"
echo -e "     $(code "sudoedit /etc/tremolo/.env")"
echo "  2. Start services:"
echo -e "     $(code "sudo systemctl start tremolo-api tremolo-music")"
