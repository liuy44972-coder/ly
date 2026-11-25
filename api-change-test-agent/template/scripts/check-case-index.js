// 用例索引一致性检查：对比测试脚本中的用例 ID 与 tests/cases 下的索引文档。
// 标记说明：[DUP] 同目录重复定义，[MISSING] 冒烟用例未登记索引，
// [EXTRA] 索引有记录但脚本无定义，[LEGACY] 跨目录重复（仅统计，不阻塞）。
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const testcasesDir = path.join(root, 'testcases');
const indexDir = path.join(root, 'tests', 'cases');
const strict = process.argv.includes('--strict');
const ID_PATTERN = /TC-(?:[A-Za-z0-9]+-)*\d{3}/g;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.DS_Store'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// 从测试脚本提取 test('TC-...') 形式的用例定义。
function collectDefinitions() {
  const definitions = [];
  const files = walk(testcasesDir).filter((file) => /\.(spec|test)\.js$/.test(file));
  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    const dir = path.dirname(rel);
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/(?:test|it)\(\s*['"`](TC-[A-Za-z0-9-]+)/g)) {
      const id = (match[1].match(ID_PATTERN) || [match[1]])[0];
      definitions.push({ id, file: rel, dir, smoke: /- smoke$/.test(path.basename(dir)) });
    }
  }
  return definitions;
}

// 从索引文档提取已登记用例 ID。
function collectIndex() {
  const ids = new Set();
  const files = walk(indexDir).filter((file) => file.endsWith('.md'));
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(ID_PATTERN)) ids.add(match[0]);
  }
  return ids;
}

function groupBy(items, keyOf) {
  const map = new Map();
  items.forEach((item) => {
    const key = keyOf(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });
  return map;
}

function main() {
  const definitions = collectDefinitions();
  const indexIds = collectIndex();
  const definedIds = new Set(definitions.map((item) => item.id));

  const dup = [];
  for (const [dir, items] of groupBy(definitions, (item) => item.dir)) {
    for (const [id, sameId] of groupBy(items, (item) => item.id)) {
      if (sameId.length > 1) dup.push({ dir, id, files: sameId.map((item) => item.file) });
    }
  }

  const missing = [...new Set(definitions.filter((item) => item.smoke).map((item) => item.id))]
    .filter((id) => !indexIds.has(id));
  const extra = [...indexIds].filter((id) => !definedIds.has(id));
  const legacy = [...groupBy(definitions, (item) => item.id)]
    .filter(([, items]) => new Set(items.map((item) => item.dir)).size > 1)
    .map(([id, items]) => ({ id, dirs: [...new Set(items.map((item) => item.dir))] }));

  console.log(`扫描结果：定义 ${definitions.length} 个 · 冒烟 ${definitions.filter((item) => item.smoke).length} 个 · 索引 ${indexIds.size} 个`);
  console.log(`[DUP] ${dup.length} 组 · [MISSING] ${missing.length} 个 · [EXTRA] ${extra.length} 个 · [LEGACY] ${legacy.length} 个`);

  dup.forEach((item) => console.log(`  [DUP] ${item.dir} · ${item.id} × ${item.files.length}`));
  missing.forEach((id) => console.log(`  [MISSING] ${id} 已在冒烟目录定义，但未登记索引`));
  extra.forEach((id) => console.log(`  [EXTRA] ${id} 已登记索引，但没有对应定义`));
  legacy.slice(0, 20).forEach((item) => console.log(`  [LEGACY] ${item.id} 出现在 ${item.dirs.join(' / ')}`));
  if (legacy.length > 20) console.log(`  [LEGACY] 其余 ${legacy.length - 20} 个略`);

  const blocking = dup.length + missing.length;
  if (blocking === 0) {
    console.log('索引与用例定义一致。');
    return;
  }
  console.log(strict
    ? '严格模式：存在 DUP/MISSING，退出码 1。'
    : '报告模式：以上为待整改项，退出码 0；需要门禁时使用 cases:check:strict。');
  if (strict) process.exit(1);
}

main();
