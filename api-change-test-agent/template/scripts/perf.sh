#!/usr/bin/env bash
# k6 压测入口：scripts/perf.sh [场景名|all]
# 环境由 TEST_PROFILE 决定，加载 .env 与 .env.<profile>；负载模型见 perf/lib/common.js。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:-all}"
PROFILE="${TEST_PROFILE:-}"

export PATH="$HOME/.local/bin:$PATH"

if ! command -v k6 >/dev/null 2>&1; then
  echo "未找到 k6，请先安装：brew install k6" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
[ -f "$ROOT/.env" ] && . "$ROOT/.env"
if [ -n "$PROFILE" ] && [ -f "$ROOT/.env.$PROFILE" ]; then
  # shellcheck disable=SC1090
  . "$ROOT/.env.$PROFILE"
fi
set +a

if [ -z "${API_BASE_URL:-}" ]; then
  echo "缺少 API_BASE_URL，请先配置 .env${PROFILE:+ 或 .env.$PROFILE}" >&2
  exit 1
fi

mkdir -p "$ROOT/perf-results"
fail=0

run_one() {
  local file="$1"
  echo "== $(basename "$file" .js)（${PROFILE:-default}）"
  # shellcheck disable=SC2086
  k6 run ${PERF_K6_ARGS:-} "$file" || fail=1
}

if [ "$TARGET" = "all" ]; then
  for file in "$ROOT"/perf/*.js; do
    case "$(basename "$file")" in
      config.js) continue ;;
    esac
    run_one "$file"
  done
else
  if [ ! -f "$ROOT/perf/$TARGET.js" ]; then
    echo "场景不存在：perf/$TARGET.js" >&2
    exit 2
  fi
  run_one "$ROOT/perf/$TARGET.js"
fi

exit "$fail"
