// 按目录执行用例并生成 Allure 报告，供 CI 与本地手动触发使用。
// 用法：npm run test:report:dir --path="testcases/dev- all"
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const raw = (args.find((arg) => arg.startsWith('--path=')) || '').slice('--path='.length);
const target = raw.replace(/^["']|["']$/g, '') || 'testcases';

if (!fs.existsSync(path.resolve(process.cwd(), target))) {
  console.error(`测试目录不存在：${target}`);
  process.exit(2);
}

for (const dir of ['allure-results', 'allure-report']) {
  fs.rmSync(path.join(process.cwd(), dir), { recursive: true, force: true });
}

const jest = spawnSync(
  'npx',
  ['jest', target, '--runInBand', '--reporters=default', '--reporters=jest-allure2-reporter'],
  { stdio: 'inherit' }
);

const allure = spawnSync('npx', ['allure', 'generate', 'allure-results', '--clean', '-o', 'allure-report'], {
  stdio: 'inherit',
  env: { ...process.env, ALLURE_NO_ANALYTICS: '1' }
});

if (allure.status !== 0) {
  console.error('Allure 报告生成失败');
}

// 报告生成完再按用例结果返回退出码，保证 CI 拿到报告同时标红失败。
process.exit(jest.status === 0 ? 0 : 1);
