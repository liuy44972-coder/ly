// 统一请求封装：拼基址与默认 query、带鉴权、打 api 标签、内置 HTTP 与业务码校验。
import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, QUERY_DEFAULTS } from '../config.js';
import { headersOf } from './auth.js';

function buildUrl(path, query) {
  const entries = Object.entries({ ...QUERY_DEFAULTS, ...(query || {}) });
  const qs = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return qs ? `${BASE_URL}${path}?${qs}` : `${BASE_URL}${path}`;
}

export function request(api, method, path, { body, query, auth, vuIndex = 0 } = {}) {
  const params = {
    tags: { api },
    headers: { 'Content-Type': 'application/json', ...headersOf(auth, vuIndex) },
    timeout: __ENV.PERF_TIMEOUT || '10s'
  };
  const url = buildUrl(path, query);
  const res =
    method === 'GET' ? http.get(url, params) : http.post(url, body ? JSON.stringify(body) : null, params);

  check(
    res,
    {
      'HTTP 200': (r) => r.status === 200,
      '业务码 200': (r) => {
        try {
          return r.json('code') === 200;
        } catch (error) {
          return false;
        }
      }
    },
    { api }
  );
  return res;
}

export const get = (api, path, options) => request(api, 'GET', path, options);
export const post = (api, path, options) => request(api, 'POST', path, options);
