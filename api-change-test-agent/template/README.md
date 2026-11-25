# 最小工程骨架

`api-change-test-agent` 的配套脚手架。目标：新项目复制本目录后即可运行自检、索引校验、冒烟测试并产出 Allure 报告。

## 3 步上手

```bash
# 1. 复制骨架到目标项目（目标目录已有同名文件时保留原文件）
bash template/bootstrap.sh /path/to/your-project

# 2. 安装依赖
cd /path/to/your-project && npm install

# 3. 填配置并自检
#   编辑 .env：至少填 API_BASE_URL；需要登录态的用例再填 API_TOKEN
npm run selfcheck
```

跑通后：

```bash
npm run test:smoke     # 执行 testcases/dev- smoke
npm run test:report    # 执行并生成 allure-report
npm run cases:check    # 检查用例 ID 与索引一致性
```

默认读取 `.env`。需要多环境时自建 `.env.<profile>` 并用 `TEST_PROFILE=<profile> npm run test:smoke` 覆盖，例如 `TEST_PROFILE=mc`。

## 目录

| 路径 | 作用 |
|---|---|
| `config/endpoints.js` | 接口路径唯一维护点，**优先替换成你的接口** |
| `config/responseCodes.js` | 业务码常量，按项目约定补充 |
| `config/apiContract.js` | 接口契约（方法/路径/必测场景），api-coverage 的统计来源 |
| `config/testConfig.js` | 加载 `.env.<profile>`，含生产环境防护与必填校验 |
| `config/jest.setup.js` | Allure 环境信息、可选自动登录 |
| `helper/apiClient.js` | supertest 客户端封装，统一认证头与超时 |
| `helper/auth.js` | 运行时 Cookie/Token 管理，支持按需登录 |
| `helper/assertions.js` | 统一 `check(actual, label)` 入口 |
| `helper/allure-request.js` | 请求/响应附件挂载与敏感字段脱敏 |
| `helper/rollback.js` | 写操作收尾动作注册与倒序执行 |
| `helper/payOrder.js` | 带状态业务的请求封装参考（路径需替换） |
| `scripts/selfcheck.js` | 基址/鉴权/版本/数据同源四项自检 |
| `scripts/check-case-index.js` | 用例 ID 与索引一致性检查 |
| `testcases/dev- smoke/notice.spec.js` | 可运行的示例用例 |
| `testcases/db/_readonly.js` | 只读数据库查询与 PROJECTION 白名单（未配 DB 时标记 blocked） |
| `tests/cases/接口及接口用例汇总.md` | 7 列索引模板 |

## 需要替换的三处

1. `config/endpoints.js`：改成你的接口路径。
2. `fixtures/playerData.json`：改成登录接口所需的 query/body。
3. `.env`：填 `API_BASE_URL`、`CLIENT_VERSION`、`CLIENT_COMMIT`；登录态用例填 `API_TOKEN`。

## 约定

- 默认读 `.env`；需要多环境再建 `.env.<profile>`，用 `TEST_PROFILE=<profile>` 切换，例如 `TEST_PROFILE=dev npm test`。
- `testcases/<环境>- smoke/` 是冒烟目录，薄挂载文件只 `require`，不重复定义用例。
- 自检默认不自动登录；需要时设 `SELFCHECK_LOGIN=true`，会改动测试账号最后登录设备。
