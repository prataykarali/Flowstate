#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if command -v systemctl >/dev/null 2>&1 && systemctl --user is-active prismlab-inference >/dev/null 2>&1; then
    echo "Stopping via systemd user service..."
    systemctl --user stop prismlab-inference
else
    python3 scripts/prismlab_local.py stop
fi
