// 示例冒烟用例：演示用例 ID、薄挂载与断言写法，可按业务替换为真实接口。
const endpoints = require('../../config/endpoints');
const { remoteApiClient } = require('../../helper/apiClient');
const { check } = require('../../helper/assertions');

describe('Notice API tests', () => {
  // 文本用例：TC-NOTICE-001｜正常获取公告，返回 HTTP 200 与业务成功码。
  test('TC-NOTICE-001｜正常获取公告', async () => {
    const response = await remoteApiClient()
      .get(endpoints.notice)
      .query({
        ts: String(Math.floor(Date.now() / 1000)),
        commit: process.env.CLIENT_COMMIT || '0',
        version: process.env.CLIENT_VERSION || '0.0.0'
      })
      .expect('Content-Type', /json/)
      .expect(200);

    check(response.body.code, '业务码').toBe(200);
  });
});
