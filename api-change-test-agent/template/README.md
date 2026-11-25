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
npm run test:report:dir -- --path="testcases/dev- all"   # 按目录执行并出报告（CI 用）
npm run cases:check    # 检查用例 ID 与索引一致性
npm run perf:smoke     # k6 冒烟压测，需本机安装 k6
npm run perf:all       # 全场景压测，负载模型见 perf/lib/common.js
```

`--` 不能省略，否则 npm 会把 `--path` 当成自身配置。压测场景只压只读接口，鉴权优先读 `PERF_TOKENS`/`PERF_COOKIES`，都没有时才在 setup 阶段登录。

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
| `scripts/report-dir.js` | 按目录执行并生成 Allure 报告 |
| `scripts/perf.sh` | k6 压测入口，按 `TEST_PROFILE` 加载 env |
| `testcases/notice/notice.spec.js` | 用例维护点，环境目录只 require 这里 |
| `testcases/dev- smoke/` | 冒烟薄挂载 |
| `testcases/dev- all/` | 环境全量薄挂载 |
| `testcases/regression/` | 回归薄挂载 |
| `testcases/db/_readonly.js` | 只读数据库查询与 PROJECTION 白名单（未配 DB 时标记 blocked） |
| `perf/config.js`、`perf/notice.js`、`perf/lib/` | 压测场景、公共负载模型、请求与鉴权封装 |
| `.github/workflows/api-report.yml` | 手动触发的报告流水线，产物保留 14 天 |
| `tests/cases/接口及接口用例汇总.md` | 7 列索引模板 |

## CI

`.github/workflows/api-report.yml` 为手动触发（`workflow_dispatch`）：

- 输入 `profile`（默认 `dev`）与 `path`（默认 `testcases/dev- smoke`）；
- 仓库 Secrets 只放 `API_BASE_URL`、`API_TOKEN`，工作流据此生成 `.env.<profile>`，不提交任何 env 文件；
- 报告以 artifact 上传（`if: always()`，保留 14 天），用例失败仍能拿到报告，job 最终标红；
- `REDEEM_ALLOW_REDEEM`、`ROLLBACK_E2E` 等消耗类开关在 CI 中固定关闭。

## 需要替换的三处

1. `config/endpoints.js`：改成你的接口路径。
2. `fixtures/playerData.json`：改成登录接口所需的 query/body。
3. `.env`：填 `API_BASE_URL`、`CLIENT_VERSION`、`CLIENT_COMMIT`；登录态用例填 `API_TOKEN`。

## 约定

- 默认读 `.env`；需要多环境再建 `.env.<profile>`，用 `TEST_PROFILE=<profile>` 切换，例如 `TEST_PROFILE=dev npm test`。
- 用例唯一维护点是需求目录（如 `testcases/notice/`）；`<环境>- smoke/`、`<环境>-all/`、`regression/` 只做薄挂载，用 `require` 引用，不重复定义用例。
- 自检默认不自动登录；需要时设 `SELFCHECK_LOGIN=true`，会改动测试账号最后登录设备。
