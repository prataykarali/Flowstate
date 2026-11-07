#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if command -v systemctl >/dev/null 2>&1 && systemctl --user is-enabled prismlab-inference >/dev/null 2>&1; then
    echo "Starting via systemd user service..."
    systemctl --user start prismlab-inference
    sleep 1
    exec python3 scripts/prismlab_local.py status
else
    exec python3 scripts/prismlab_local.py start
fi
