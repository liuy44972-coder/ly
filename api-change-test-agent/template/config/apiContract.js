// 接口契约：覆盖率统计的正式来源（api-coverage 读取本文件）。
// 新增接口时同步在此登记方法、路径与必测场景；路径需与 config/endpoints.js 保持一致。
// 未登记的接口在覆盖率报告中会被标为「契约缺失」，不会被自动推断。
module.exports = [
  {
    name: 'notice',
    method: 'GET',
    path: '/api/notice',
    scenarios: ['success']
  },
  {
    name: 'info',
    method: 'POST',
    path: '/api/user',
    scenarios: ['success', 'auth-missing', 'auth-invalid', 'boundary']
  },
  {
    name: 'login',
    method: 'POST',
    path: '/api/user/login',
    scenarios: ['success', 'missing-param', 'invalid-type']
  }
];
