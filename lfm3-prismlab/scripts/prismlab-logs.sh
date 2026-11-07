#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
tail -n 50 -f .prismlab-local/gateway.log
