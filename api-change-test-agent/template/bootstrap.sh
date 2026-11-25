#!/usr/bin/env bash
# 把最小工程骨架复制到目标目录：bash bootstrap.sh /path/to/project
set -euo pipefail

src="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dst="${1:-$(pwd)}"

mkdir -p "$dst"
# 已存在的文件保留（BSD cp -n 在全部跳过时返回 1，故用 rsync 或忽略退出码）
if command -v rsync >/dev/null 2>&1; then
  rsync -a --ignore-existing "$src"/ "$dst"/
else
  cp -Rn "$src"/. "$dst"/ || true
fi
rm -f "$dst/bootstrap.sh"

if [ ! -f "$dst/.env" ] && [ -f "$dst/.env.example" ]; then
  cp "$dst/.env.example" "$dst/.env"
  echo "已生成 .env，请填入 API_BASE_URL，需要登录态时再填 API_TOKEN。"
fi

echo "骨架已复制到 $dst"
echo "下一步：npm install && npm run selfcheck"
