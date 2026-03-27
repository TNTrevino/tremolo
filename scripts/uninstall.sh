#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$SCRIPT_DIR/colors.sh"

if [ "$EUID" -ne 0 ]; then
  red "Run as root: sudo $0"
  exit 1
fi

green "Stopping services..."
systemctl stop tremolo-api || true
systemctl stop tremolo-music || true

green "Disabling services..."
systemctl disable tremolo-api || true
systemctl disable tremolo-music || true

green "Removing systemd unit files..."
rm -f /etc/systemd/system/tremolo-api.service
rm -f /etc/systemd/system/tremolo-music.service
systemctl daemon-reload

green "Removing application directory..."
rm -rf /opt/tremolo

green "Removing configuration..."
rm -rf /etc/tremolo

echo ""
green "Uninstall complete."
