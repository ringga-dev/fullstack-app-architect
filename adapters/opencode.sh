#!/usr/bin/env bash
# adapters/opencode.sh — Wrapper tipis: delegasikan ke satu sumber kebenaran
# (orchestrator/export.ts). Tidak ada lagi logika pipeline yang diduplikasi.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="opencode"
if command -v bun >/dev/null 2>&1; then exec bun run "$ROOT/orchestrator/export.ts" "$TARGET"; fi
if command -v tsx >/dev/null 2>&1; then exec tsx "$ROOT/orchestrator/export.ts" "$TARGET"; fi
if command -v npx >/dev/null 2>&1; then exec npx --yes tsx "$ROOT/orchestrator/export.ts" "$TARGET"; fi
echo "Error: butuh 'bun' atau 'tsx' untuk menjalankan exporter." >&2
exit 1
