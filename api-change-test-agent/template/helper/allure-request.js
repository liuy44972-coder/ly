// Allure 请求/响应附件与脱敏：报告里不允许出现 Token、Cookie、sign 等明文。
// jest-allure2-reporter 不可用时自动降级为纯脱敏函数，不影响用例执行。

const SENSITIVE_KEYS = /^(authorization|cookie|token|api_token|sign|password|secret)$/i;

function maskValue(value) {
  if (value === undefined || value === null) return value;
  const text = String(value);
  if (text.length <= 8) return '***';
  return `${text.slice(0, 4)}***${text.slice(-2)}`;
}

// 递归脱敏：键名命中 SENSITIVE_KEYS 时替换为掩码，其余保持原值。
function maskSensitive(input) {
  if (Array.isArray(input)) return input.map(maskSensitive);
  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key,
        SENSITIVE_KEYS.test(key) ? maskValue(value) : maskSensitive(value)
      ])
    );
  }
  return input;
}

function loadReporter() {
  try {
    // eslint-disable-next-line global-require
    const api = require('jest-allure2-reporter/api');
    return api.reporter || api.default || null;
  } catch {
    return null;
  }
}

// 把一次请求交换挂到 Allure 报告；缺少 reporter 时静默跳过。
function attachExchange(name, { request, response, error } = {}) {
  const reporter = loadReporter();
  const payload = JSON.stringify(
    maskSensitive({ request, response, error: error ? String(error.message || error) : undefined }),
    null,
    2
  );
  if (reporter && typeof reporter.attachment === 'function') {
    try {
      reporter.attachment(`${name}.json`, Buffer.from(payload), 'application/json');
      return;
    } catch {
      // 版本差异导致签名不匹配时退化为不挂附件，不影响用例。
    }
  }
  if (process.env.ALLURE_DEBUG_ATTACH === 'true') {
    console.log(`[allure-request] ${name}\n${payload}`);
  }
}

module.exports = { maskValue, maskSensitive, attachExchange };
