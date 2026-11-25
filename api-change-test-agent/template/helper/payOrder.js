// 带状态业务的请求封装参考：下单 → 查询 → 收尾，禁止在用例里直接拼 URL。
// 这里的路径是示例，接入项目时替换为真实接口，并与 config/endpoints.js 对齐。
const endpoints = require('../config/endpoints');

const PAY_PATH = endpoints.pay || '/api/pay';
const PAY_QUERY_PATH = endpoints.payQuery || '/api/pay/query';

// 下单：返回 orderId 等业务标识，供后续状态断言使用。
async function createOrder(client, payload) {
  const response = await client.post(PAY_PATH).send(payload);
  return response;
}

// 查询订单状态：用于验证状态流转是否落库/生效。
async function queryOrder(client, orderId) {
  const response = await client.get(PAY_QUERY_PATH).query({ orderId });
  return response;
}

// 收尾：取消或关闭未支付订单，避免脏数据；失败不应阻断用例结论。
async function closeOrder(client, orderId) {
  if (!endpoints.payClose) return { skipped: true, reason: 'endpoints.payClose 未定义' };
  return client.post(endpoints.payClose).send({ orderId });
}

module.exports = { createOrder, queryOrder, closeOrder, PAY_PATH, PAY_QUERY_PATH };
