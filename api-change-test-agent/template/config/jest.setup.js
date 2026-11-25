// Jest 启动钩子：加载环境配置、写出报告环境信息，并保留登录态用例的初始化入口。
const fs = require('fs');
const path = require('path');

require('../config/testConfig');

const allureResultsDir = path.resolve(__dirname, '../allure-results');
fs.mkdirSync(allureResultsDir, { recursive: true });
fs.writeFileSync(
  path.join(allureResultsDir, 'environment.properties'),
  [
    `test.env=${process.env.TEST_ENV || 'unknown'}`,
    `test.profile=${process.env.TEST_PROFILE || '(default)'}`,
    `node.version=${process.version}`
  ].join('\n') + '\n'
);

beforeAll(async () => {
  if (process.env.SELFCHECK_LOGIN === 'true') {
    await require('../helper/auth').ensureRuntimeAuth();
  }
});

afterEach(() => {
  jest.restoreAllMocks();
});
