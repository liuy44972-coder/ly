// 统一请求客户端：集中处理认证请求头、默认超时与基础地址。
const request = require('supertest');
const testConfig = require('../config/testConfig');
const { getAuthHeaders } = require('./auth');

function createClient(target, options = {}) {
  const { auth = {}, headers = {}, timeout = testConfig.timeout } = options || {};
  const withAuth = (method, path) => {
    const requestBuilder = request(target)[method](path);
    const requestHeaders = {
      ...getAuthHeaders(auth),
      ...headers
    };
    Object.entries(requestHeaders).forEach(([name, value]) => {
      requestBuilder.set(name, value);
    });
    return requestBuilder.timeout(timeout);
  };

  return {
    get: (path) => withAuth('get', path),
    post: (path) => withAuth('post', path),
    put: (path) => withAuth('put', path),
    patch: (path) => withAuth('patch', path),
    delete: (path) => withAuth('delete', path)
  };
}

// 指向 API_BASE_URL 的远程客户端，接口测试默认使用它。
function remoteApiClient(options = {}) {
  const baseUrl = testConfig.baseURL.replace(/\/+$/, '');
  return createClient(baseUrl, options);
}

module.exports = { remoteApiClient, createClient };
