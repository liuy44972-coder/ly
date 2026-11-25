// 执行前环境自检：基址可达、鉴权有效、版本门控、数据同源（可选）。
// 默认不自动登录，避免改动测试账号的登录设备；确需登录时传 --login。
// 输出不含 Token、Cookie、URI 等敏感值，只报状态码、业务码与配置是否就绪。
const fs = require('fs');
const path = require('path');
const request = require('supertest');

let endpoints;
let responseCodes;
let auth;

try {
  require('../config/testConfig');
  endpoints = require('../config/endpoints');
  responseCodes = require('../config/responseCodes');
  auth = require('../helper/auth');
} catch (error) {
  console.error(`[FAIL] 配置加载失败：${error.message}`);
  process.exit(1);
}

const timeout = Number(process.env.TEST_TIMEOUT_MS || 15000);
const args = new Set(process.argv.slice(2));
const results = [];

function record(status, name, detail) {
  results.push({ status, name, detail });
}

function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return '<invalid-url>';
  }
}

// 检查一：基址可达。4xx 视为可达，连接失败或 5xx 视为环境问题。
async function checkReachable(baseURL) {
  try {
    const response = await request(baseURL).get('/').timeout(timeout);
    if (response.status >= 500) {
      record('FAIL', '基址可达', `HTTP ${response.status}，服务端 5xx`);
      return;
    }
    record('PASS', '基址可达', `HTTP ${response.status}`);
  } catch (error) {
    record('FAIL', '基址可达', `连接失败：${error.code || error.name}`);
  }
}

// 检查二、三：用一次只读请求同时验证鉴权与版本门槛。
async function checkAuthAndVersion(baseURL) {
  const hasCredential = Boolean(auth.getRuntimeToken() || auth.getRuntimeCookie());
  if (!hasCredential && !args.has('--login')) {
    record('SKIP', '鉴权有效', '未配置 API_TOKEN，且未传 --login，跳过在线校验');
    record('SKIP', '版本与门控', '鉴权未校验，业务码无法判定');
    return;
  }

  if (!hasCredential) {
    try {
      await auth.ensureRuntimeAuth();
      record('PASS', '鉴权有效', '自动登录成功，已获得运行时 Token/Cookie');
    } catch (error) {
      record('FAIL', '鉴权有效', `自动登录失败：${error.message}`);
      record('SKIP', '版本与门控', '鉴权未通过，业务码无法判定');
      return;
    }
  }

  const query = {
    ts: String(Math.floor(Date.now() / 1000)),
    commit: process.env.INFO_COMMIT || process.env.CLIENT_COMMIT || '0',
    version: process.env.INFO_VERSION || process.env.CLIENT_VERSION || '0.0.0',
    apiversion: process.env.INFO_API_VERSION || process.env.API_VERSION
  };
  Object.keys(query).forEach((key) => query[key] === undefined && delete query[key]);

  const cookie = auth.getRuntimeCookie();
  const token = auth.getRuntimeToken();
  const headers = cookie ? { Cookie: cookie } : (token ? { Authorization: `Bearer ${token}` } : {});

  let response;
  try {
    response = await request(baseURL)
      .post(endpoints.info)
      .query(query)
      .set('Content-Type', 'application/json;charset=utf-8')
      .set(headers)
      .send({ payload: process.env.INFO_PAYLOAD || '{"list":[]}' })
      .timeout(timeout);
  } catch (error) {
    record('FAIL', '鉴权有效', `请求失败：${error.code || error.name}`);
    record('SKIP', '版本与门控', '请求失败，业务码无法判定');
    return;
  }

  const code = Number(response.body?.code);
  const authCodes = [
    responseCodes.ACCOUNT_TOKEN_EXPIRE,
    responseCodes.ACCOUNT_TOKEN_MISSING,
    responseCodes.ACCOUNT_TOKEN_FORMAT
  ];
  const versionCodes = [responseCodes.VERSION_LOWER_SERVER, responseCodes.RES_VERSION_LOWER_SERVER];

  if (code === responseCodes.SUCCESS) {
    record('PASS', '鉴权有效', `HTTP ${response.status} · code=${code}`);
    record('PASS', '版本与门控', `CLIENT_VERSION=${process.env.CLIENT_VERSION || '未配置'}`);
  } else if (authCodes.includes(code)) {
    record('FAIL', '鉴权有效', `HTTP ${response.status} · code=${code}，凭据已失效`);
    record('SKIP', '版本与门控', '鉴权未通过，业务码无法判定');
  } else if (versionCodes.includes(code)) {
    record('PASS', '鉴权有效', '凭据未被拒绝');
    record('FAIL', '版本与门控', `code=${code}，客户端版本低于服务端要求`);
  } else {
    record('WARN', '鉴权有效', `HTTP ${response.status} · code=${code}，需人工确认是否与本次变更相关`);
    record('WARN', '版本与门控', `HTTP ${response.status} · code=${code}`);
  }
}

// 检查四：数据同源（可选）。项目没有 testcases/db/_readonly.js 时直接跳过。
async function checkDataSource() {
  const dbHelper = path.resolve(__dirname, '../testcases/db/_readonly.js');
  if (!fs.existsSync(dbHelper)) {
    record('SKIP', '数据同源', '未提供 testcases/db/_readonly.js，DB 断言应标 blocked');
    return;
  }
  if (!process.env.FIRESTORE_PROJECT_ID && (!process.env.MONGODB_URI || !process.env.MONGODB_DB)) {
    record('SKIP', '数据同源', '未配置数据库连接，DB 断言应标 blocked');
    return;
  }

  const { closeDatabase, findUser, withDatabase } = require(dbHelper);
  const userId = auth.getRuntimeUserId();
  if (!userId) {
    record('WARN', '数据同源', '缺少 TEST_USER_ID，无法抽样核对');
    return;
  }

  try {
    const user = await withDatabase((db) => findUser(db, userId));
    record(user ? 'PASS' : 'WARN', '数据同源', user
      ? '库中存在 TEST_USER_ID 对应记录'
      : '库中未找到 TEST_USER_ID 记录，确认 DB 与 API 指向同一环境');
  } catch (error) {
    record('WARN', '数据同源', `数据库不可读：${error.message}`);
  } finally {
    await closeDatabase().catch(() => {});
  }
}

async function main() {
  const baseURL = (process.env.API_BASE_URL || '').replace(/\/+$/, '');
  const profile = process.env.TEST_PROFILE || '(default)';
  console.log(`环境自检 · profile=${profile} · 基址=${originOf(baseURL)}`);

  await checkReachable(baseURL);
  await checkAuthAndVersion(baseURL);
  await checkDataSource();

  results.forEach(({ status, name, detail }) => console.log(`[${status}] ${name}：${detail}`));

  const count = (status) => results.filter((item) => item.status === status).length;
  const failedItems = results.filter((item) => item.status === 'FAIL');
  console.log(`结论：PASS ${count('PASS')} · WARN ${count('WARN')} · SKIP ${count('SKIP')} · FAIL ${count('FAIL')}`);
  if (failedItems.length === 0) {
    console.log('自检无失败项，可继续执行用例。');
    return;
  }
  if (failedItems.every((item) => item.name === '鉴权有效')) {
    console.log('鉴权失败仅阻塞依赖登录态的用例；不依赖鉴权的只读接口可继续执行，但必须在交付输出中记录该差异。');
  } else {
    console.log('存在基址或版本类失败，按环境问题处理后停止，不要修改断言迁就。');
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(`[FAIL] 自检异常退出：${error.message}`);
  process.exit(1);
});
