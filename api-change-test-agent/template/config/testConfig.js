// 加载环境变量并导出统一测试配置；缺少关键项时直接失败，避免误连环境。
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 读取 .env 文件，并按需覆盖已有环境变量。
function loadEnvFile(filePath, override = false) {
  if (!fs.existsSync(filePath)) return;
  const values = dotenv.parse(fs.readFileSync(filePath));
  for (const [key, value] of Object.entries(values)) {
    if (override || process.env[key] === undefined) process.env[key] = value;
  }
}

// 先加载公共配置，再加载 TEST_PROFILE 指定的环境文件。
loadEnvFile(path.resolve(__dirname, '../.env'));
const profile = process.env.TEST_PROFILE;
const profileFile = profile
  ? path.resolve(__dirname, `../.env.${profile}`)
  : path.resolve(__dirname, '../.env.test');
if (profile && !fs.existsSync(profileFile)) {
  throw new Error(`测试配置文件不存在: .env.${profile}`);
}
loadEnvFile(profileFile, Boolean(profile));

// 禁止把测试指向生产环境。
function assertSafeTestConfig() {
  const env = (process.env.TEST_ENV || 'dev').toLowerCase();
  const baseUrl = process.env.API_BASE_URL || '';
  if (['prod', 'production'].includes(env) || process.env.NODE_ENV === 'production') {
    throw new Error('测试配置禁止使用生产环境');
  }
  if (/^https?:\/\/[^/]*(?:prod|production)/i.test(baseUrl)) {
    throw new Error('测试配置禁止使用生产环境地址');
  }
  if (!baseUrl) {
    throw new Error('缺少 API_BASE_URL，请在 .env.<profile> 或 .env 中配置');
  }
}

// 统一 API_TOKEN 格式，确保请求使用 token=... Cookie。
function normalizeApiToken(value) {
  if (!value) return value;
  const normalized = value.trim();
  if (normalized.startsWith('Bearer ')) return normalized.slice('Bearer '.length);
  if (normalized.startsWith('token=')) return normalized;
  return `token=${normalized}`;
}

const apiToken = normalizeApiToken(process.env.API_TOKEN);
assertSafeTestConfig();

module.exports = {
  baseURL: process.env.API_BASE_URL,
  apiToken: apiToken?.replace(/^token=/, ''),
  cookie: apiToken,
  timeout: Number(process.env.TEST_TIMEOUT_MS || 5000)
};
