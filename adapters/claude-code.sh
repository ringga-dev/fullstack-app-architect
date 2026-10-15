#!/usr/bin/env bash
# adapters/claude-code.sh — Wrapper tipis -> orchestrator/export.ts (target: claude).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="claude"
if command -v bun >/dev/null 2>&1; then exec bun run "$ROOT/orchestrator/export.ts" "$TARGET"; fi
if command -v tsx >/dev/null 2>&1; then exec tsx "$ROOT/orchestrator/export.ts" "$TARGET"; fi
if command -v npx >/dev/null 2>&1; then exec npx --yes tsx "$ROOT/orchestrator/export.ts" "$TARGET"; fi
echo "Error: butuh 'bun' atau 'tsx' untuk menjalankan exporter." >&2
exit 1
