// 鉴权来源：优先环境变量，其次 setup 阶段登录一次；两者都不可用时直接失败。
import { login } from './login.js';

export function resolveAuth() {
  const tokens = (__ENV.PERF_TOKENS || '').split(',').map((item) => item.trim()).filter(Boolean);
  const cookies = (__ENV.PERF_COOKIES || '').split(',').map((item) => item.trim()).filter(Boolean);

  if (tokens.length > 0) return { type: 'bearer', values: tokens };
  if (cookies.length > 0) return { type: 'cookie', values: cookies };
  return login();
}

// 多账号时按 VU 轮换取用，避免单 token 打满限流。
export function headersOf(auth, vuIndex = 0) {
  if (!auth || auth.values.length === 0) return {};
  const value = auth.values[vuIndex % auth.values.length];
  return auth.type === 'cookie' ? { Cookie: value } : { Authorization: `Bearer ${value}` };
}
