// k6 场景的共用配置。路径需与 config/endpoints.js 保持一致（k6 只支持 ESM，无法直接 require）。
export const BASE_URL = (__ENV.API_BASE_URL || '').replace(/\/+$/, '');

if (!BASE_URL) {
  throw new Error('缺少 API_BASE_URL，请先通过 .env 或环境变量提供压测基址');
}

export const PATHS = {
  notice: '/api/notice',
  info: '/api/user',
  login: '/api/user/login'
};

// 默认可压字段：版本号与提交号，按项目实际值覆盖。
export const QUERY_DEFAULTS = {
  ts: String(Math.floor(Date.now() / 1000)),
  commit: __ENV.CLIENT_COMMIT || '0',
  version: __ENV.CLIENT_VERSION || '0.0.0'
};
