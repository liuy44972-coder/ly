// 公告接口压测场景：只读接口，可作为新增场景的模板。
import { get } from './lib/http.js';
import { buildOptions } from './lib/common.js';
import { resolveAuth } from './lib/auth.js';
import { PATHS } from './config.js';

export const options = buildOptions('notice');

export function setup() {
  return { auth: resolveAuth() };
}

export default function (data) {
  get('notice', PATHS.notice, { auth: data.auth, vuIndex: __VU - 1 });
}
