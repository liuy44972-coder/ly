// 管理运行时登录态：支持从环境变量注入 Cookie/Token，也支持按需自动登录。
const request = require('supertest');
const endpoints = require('../config/endpoints');
const testConfig = require('../config/testConfig');
const playerData = require('../fixtures/playerData.json');
let runtimeCookie;
let runtimeToken;
let runtimeUserId;
let authPromise;

function setRuntimeCookie(cookieValue) {
  if (!cookieValue) return;
  runtimeCookie = cookieValue;
  testConfig.cookie = cookieValue;
}

function setRuntimeToken(tokenValue) {
  if (!tokenValue) return;
  runtimeToken = tokenValue;
  testConfig.apiToken = tokenValue;
}

// 从登录响应中提取 Set-Cookie、Token 与用户 ID。
function updateRuntimeCookie(response) {
  const headers = response?.headers || {};
  const setCookie = headers['set-cookie'] || headers['Set-Cookie'];
  const cookieFromHeader = Array.isArray(setCookie)
    ? setCookie.map((value) => value.split(';', 1)[0]).filter(Boolean).join('; ')
    : undefined;
  const body = response?.body || {};
  const token = body.token || body.data?.token;
  const cookie = body.cookie || body.data?.cookie || cookieFromHeader;
  const userId = body.data?.id;

  if (typeof userId === 'string' && userId) {
    runtimeUserId = userId;
    process.env.TEST_USER_ID = userId;
  }
  if (typeof token === 'string' && token) setRuntimeToken(token);
  if (typeof cookie === 'string' && cookie) setRuntimeCookie(cookie);
  if (typeof token === 'string' && token && !cookie) setRuntimeCookie(`token=${token}`);
}

function getRuntimeCookie() {
  return runtimeCookie || testConfig.cookie;
}

function getRuntimeToken() {
  return runtimeToken || testConfig.apiToken;
}

function getRuntimeUserId() {
  return runtimeUserId || process.env.TEST_USER_ID;
}

// 自动登录并缓存运行时认证信息；登录参数默认取 fixtures/playerData.json。
async function ensureRuntimeAuth({ force = false } = {}) {
  if (!force && (runtimeCookie || runtimeToken)) return;
  if (force) {
    authPromise = undefined;
    runtimeCookie = undefined;
    runtimeToken = undefined;
    runtimeUserId = undefined;
  }
  if (!authPromise) {
    const baseUrl = testConfig.baseURL.replace(/\/+$/, '');
    const query = {
      ts: process.env.LOGIN_TS || playerData.login.query.ts,
      commit: process.env.LOGIN_COMMIT || playerData.login.query.commit,
      version: process.env.LOGIN_VERSION || playerData.login.query.version,
      apiversion: process.env.LOGIN_API_VERSION || playerData.login.query.apiversion,
      resVersion: process.env.LOGIN_RESOURCE_VERSION || playerData.login.query.resVersion
    };
    const body = {
      device: process.env.LOGIN_DEVICE || playerData.login.device,
      channel: process.env.LOGIN_CHANNEL ?? playerData.login.channel,
      channelId: process.env.LOGIN_CHANNEL_ID ?? playerData.login.channelId,
      platform: process.env.LOGIN_PLATFORM || playerData.login.platform,
      timezone: Number(process.env.LOGIN_TIMEZONE || playerData.login.timezone)
    };
    authPromise = request(baseUrl)
      .post(endpoints.login)
      .query(query)
      .set('Content-Type', 'application/json;charset=utf-8')
      .timeout(testConfig.timeout)
      .send(body)
      .then((response) => {
        if (response.status !== 200 || Number(response.body?.code) !== 200) {
          throw new Error(`自动登录失败，业务码: ${response.body?.code ?? 'unknown'}`);
        }
        updateRuntimeCookie(response);
        if (!getRuntimeCookie() && !getRuntimeToken()) {
          throw new Error('登录成功但响应中未找到可复用的 Token/Cookie');
        }
      });
  }
  return authPromise;
}

// 根据显式选项或运行时凭据生成认证请求头；Cookie 与 Bearer 二选一。
function getAuthHeaders(options = {}) {
  const hasToken = Object.prototype.hasOwnProperty.call(options, 'token');
  const hasCookie = Object.prototype.hasOwnProperty.call(options, 'cookieValue');
  const token = hasToken ? options.token : (hasCookie ? undefined : getRuntimeToken());
  const cookieValue = hasCookie ? options.cookieValue : getRuntimeCookie();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(cookieValue && !token ? { Cookie: cookieValue } : {})
  };
}

module.exports = {
  ensureRuntimeAuth,
  getAuthHeaders,
  getRuntimeCookie,
  getRuntimeToken,
  getRuntimeUserId,
  setRuntimeCookie,
  setRuntimeToken,
  updateRuntimeCookie
};
