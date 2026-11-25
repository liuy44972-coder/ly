#!/usr/bin/env bash
# 把最小工程骨架复制到目标目录：bash bootstrap.sh /path/to/project
set -euo pipefail

src="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dst="${1:-$(pwd)}"

mkdir -p "$dst"
cp -Rn "$src"/. "$dst"/
rm -f "$dst/bootstrap.sh"

if [ ! -f "$dst/.env" ] && [ -f "$dst/.env.example" ]; then
  cp "$dst/.env.example" "$dst/.env"
  echo "已生成 .env，请填入 API_BASE_URL，需要登录态时再填 API_TOKEN。"
fi

echo "骨架已复制到 $dst"
echo "下一步：npm install && npm run selfcheck"
