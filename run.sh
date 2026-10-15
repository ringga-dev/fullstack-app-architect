#!/usr/bin/env bash
# run.sh — One-click runner (Linux/macOS/WSL/Git Bash).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "Multi-Agent Architect - Auto Start"
echo "=================================="

PROJECT="multi-agent-project"
IDEA=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -n|--name)
      PROJECT="${2:-$PROJECT}"
      shift 2
      ;;
    -i|--idea)
      shift
      IDEA="$*"
      break
      ;;
    *)
      IDEA="${IDEA} $1"
      shift
      ;;
  esac
done

IDEA_TRIM="$(echo "${IDEA}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"

# Optional: export agents to all platforms (cross-platform TS exporter)
if command -v bun >/dev/null 2>&1; then
  echo "-> Exporting for OpenCode / Antigraviti / Hermes..."
  bun run orchestrator/export.ts all >/dev/null 2>&1 || true
elif [[ -x "./adapters/opencode.sh" ]]; then
  ./adapters/opencode.sh >/dev/null 2>&1 || true
  ./adapters/antigraviti.sh >/dev/null 2>&1 || true
  ./adapters/hermes.sh >/dev/null 2>&1 || true
fi

echo ""
echo "> Running orchestrator..."
echo ""

if command -v bun >/dev/null 2>&1; then
  exec bun run orchestrator/index.ts --name "$PROJECT" --idea "$IDEA_TRIM"
elif command -v tsx >/dev/null 2>&1; then
  exec tsx orchestrator/index.ts --name "$PROJECT" --idea "$IDEA_TRIM"
elif [[ -x "./node_modules/.bin/tsx" ]]; then
  exec ./node_modules/.bin/tsx orchestrator/index.ts --name "$PROJECT" --idea "$IDEA_TRIM"
elif [[ -x "./bin/multi-agent-architect" ]]; then
  exec ./bin/multi-agent-architect --name "$PROJECT" --idea "$IDEA_TRIM"
else
  echo "Runtime not found."
  echo "Install: bun (recommended) or 'npm i -D tsx'"
  exit 1
fi
