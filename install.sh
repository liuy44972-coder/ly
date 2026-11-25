#!/usr/bin/env bash
# 一条命令安装 skill 并搭好最小工程：bash install.sh [目标项目根]
#
# 做四件事：
#   1. 把 5 个 skill 复制到 <目标>/.trae/skills/
#   2. 把 api-change-test-agent 的 template/ 骨架复制到 <目标>（已存在的文件不覆盖）
#   3. npm install
#   4. 基址已配置时运行自检
#
# 选项：
#   --no-install    跳过 npm install
#   --no-skeleton   只装 skill，不复制工程骨架
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET=""
DO_INSTALL=1
DO_SKELETON=1

for arg in "$@"; do
  case "$arg" in
    --no-install) DO_INSTALL=0 ;;
    --no-skeleton) DO_SKELETON=0 ;;
    -h|--help)
      sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) TARGET="$arg" ;;
  esac
done

TARGET="${TARGET:-$(pwd)}"

SKILLS=(
  api-change-test-agent
  api-coverage
  api-perf-k6
  senior-qa-brain
  api-case-to-jest-supertest
)

# 兼容两种布局：仓库根（skills 直接平铺）与项目内（.trae/skills/）。
SKILL_SRC=""
for cand in "$ROOT/.trae/skills" "$ROOT"; do
  if [ -f "$cand/api-change-test-agent/SKILL.md" ]; then
    SKILL_SRC="$cand"
    break
  fi
done
if [ -z "$SKILL_SRC" ]; then
  echo "找不到 api-change-test-agent/SKILL.md，请在仓库根或项目内的 .trae/skills 同层执行。" >&2
  exit 1
fi

mkdir -p "$TARGET"
DEST="$TARGET/.trae/skills"

echo "源 skills：$SKILL_SRC"
echo "目标项目：$TARGET"
echo

# 1. 安装 skill
for skill in "${SKILLS[@]}"; do
  src="$SKILL_SRC/$skill"
  if [ ! -f "$src/SKILL.md" ]; then
    echo "[skip] 源缺失：$skill"
    continue
  fi
  mkdir -p "$DEST/$skill"
  cp -R "$src"/. "$DEST/$skill"/
  echo "[skill] $skill -> .trae/skills/$skill"
done
echo

# 2. 复制工程骨架
if [ "$DO_SKELETON" -eq 1 ]; then
  bootstrap="$SKILL_SRC/api-change-test-agent/template/bootstrap.sh"
  if [ -f "$bootstrap" ]; then
    bash "$bootstrap" "$TARGET"
  else
    echo "[skip] 未找到 template/bootstrap.sh"
  fi
  echo
fi

# 3. 安装依赖
if [ "$DO_INSTALL" -eq 1 ]; then
  if command -v npm >/dev/null 2>&1; then
    echo "[npm] 安装依赖（首次约数分钟）…"
    ( cd "$TARGET" && npm install --no-audit --no-fund )
    echo
  else
    echo "[warn] 未找到 npm，跳过依赖安装；安装后执行：cd \"$TARGET\" && npm install"
    echo
  fi
fi

# 4. 自检：基址仍是占位值时不跑，避免误报失败
if [ -f "$TARGET/package.json" ] && [ -d "$TARGET/node_modules" ]; then
  BASE_URL="$(grep -E '^API_BASE_URL=' "$TARGET/.env" 2>/dev/null | head -1 | cut -d= -f2- || true)"
  if [ -z "$BASE_URL" ] || printf '%s' "$BASE_URL" | grep -q 'your-test-host'; then
    echo "[自检] 跳过：.env 的 API_BASE_URL 仍是占位值。"
    echo "       填好后执行：cd \"$TARGET\" && npm run selfcheck"
  else
    ( cd "$TARGET" && npm run selfcheck )
  fi
else
  echo "[自检] 跳过：依赖未安装。"
fi

echo
echo "完成。下一步："
if [ -f "$TARGET/package.json" ]; then
  echo "  1) 编辑 $TARGET/.env 填 API_BASE_URL（需要登录态再填 API_TOKEN）"
  echo "  2) 替换 $TARGET/config/endpoints.js 与 config/responseCodes.js 为真实接口与业务码"
  echo "  3) cd \"$TARGET\" && npm run test:smoke"
else
  echo "  1) 需要工程骨架时：bash \"$DEST/api-change-test-agent/template/bootstrap.sh\" \"$TARGET\""
  echo "  2) 触发方式：在 Trae 里说「这个接口改了，帮我看下要补哪些用例」"
fi
