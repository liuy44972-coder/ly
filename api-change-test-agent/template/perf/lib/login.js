// 登录换取鉴权：仅在未配置 PERF_TOKENS / PERF_COOKIES 时由 setup 调用一次。
// 登录参数结构按项目实际接口调整，缺失字段会体现在业务码上而不是被吞掉。
import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, PATHS } from '../config.js';

function loginPayload() {
  return {
    device: __ENV.PERF_DEVICE || 'perf',
    channel: __ENV.PERF_CHANNEL || 'perf',
    channelId: __ENV.PERF_CHANNEL_ID || 'perf',
    platform: __ENV.PERF_PLATFORM || 'perf',
    timezone: Number(__ENV.PERF_TIMEZONE || 8),
    query: {
      ts: String(Math.floor(Date.now() / 1000)),
      commit: __ENV.CLIENT_COMMIT || '0',
      version: __ENV.CLIENT_VERSION || '0.0.0',
      apiversion: __ENV.API_VERSION || '0',
      resVersion: '0'
    }
  };
}

export function login() {
  const res = http.post(`${BASE_URL}${PATHS.login}`, JSON.stringify(loginPayload()), {
    headers: { 'Content-Type': 'application/json' },
    tags: { api: 'login' }
  });

  const ok = check(res, {
    '登录 HTTP 200': (r) => r.status === 200,
    '登录业务码 200': (r) => r.json('code') === 200
  });
  if (!ok) {
    throw new Error(`登录失败：HTTP ${res.status}。请核对 .env 的登录参数，或直接配置 PERF_TOKENS/PERF_COOKIES`);
  }

  const cookie = res.headers['Set-Cookie'] || res.headers['set-cookie'];
  const token = res.json('data.token') || res.json('token');
  if (cookie) return { type: 'cookie', values: [String(cookie).split(';')[0]] };
  if (token) return { type: 'bearer', values: [String(token)] };
  throw new Error('登录响应未返回 token 或 cookie，请配置 PERF_TOKENS/PERF_COOKIES');
}
