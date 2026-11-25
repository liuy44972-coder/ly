# 执行、环境自检与 CI

## 常用命令

- 环境由 `TEST_PROFILE=nova|mc|mf` 决定，对应 `.env.<profile>`；未设置时读取 `.env.test`；
- `npm run test:smoke:nova`、`npm run test:smoke:mc`、`npm run test:smoke:mf`、`npm run test:db`、`npm run test:rollback`、`npm run test:redeem`；
- 串行执行：远程用例、尤其会争用同一账号/单据/兑换码的用例必须 `--runInBand`；禁止 `test.concurrent`，禁止同时跑多个环境目录；新增需求目录要能单独运行；
- 超时口径：整体超时由 [jest.config.js](../../../jest.config.js) 的 `testTimeout` 控制（默认 30000ms，`JEST_TIMEOUT_MS` 可覆盖，CI 可放宽到 60000）；单请求保持 `timeout(15000)`；超时归环境/网络类，可重试 1 次，一次性资源用例超时不重试，且不得把超时写成断言失败；
- 静态检查只针对改动路径：`npx eslint "<改动文件或目录>"`；`npm run lint` 是全仓检查，存在历史遗留错误（`scripts/mail-request.js`、`nova- smoke/claimMail.spec.js`、`pay优化/*` 等），不作为本次改动失败的依据，但不得新增错误。

## 环境自检（执行前四项都过再跑用例）

```bash
TEST_PROFILE=<nova|mc|mf> npm run selfcheck          # 只读，不自动登录
TEST_PROFILE=<nova|mc|mf> npm run selfcheck -- --login  # 无 API_TOKEN 时显式允许自动登录
```

脚本输出 `[PASS]/[WARN]/[SKIP]/[FAIL]` 四类标记：任一 `FAIL` 退出码为 1，必须停下按环境问题报告；`SKIP` 必须在交付输出里写明原因（如 DB 未配置 → DB 断言标 `blocked`）。

| # | 检查 | 做法 | 不通过时 |
|---|---|---|---|
| 1 | 基址可达 | 对 `baseURL` 发一次只读请求，确认有响应而不是连接失败/5xx | 判为环境问题，停止并报告 |
| 2 | 鉴权有效 | 用一个需要登录的只读接口确认 token/cookie 未过期（`611` 类） | 换凭据，或只跑不校验登录态的用例并记录差异 |
| 3 | 版本与门控 | 客户端版本满足接口门槛（如兑换码 `695`），门控开关符合本次范围 | 调整版本或标 `blocked`，不改断言迁就 |
| 4 | 数据同源 | `MONGODB_DB` 与被测 API 指向同一套数据，抽样一条记录核对 | DB 断言标 `blocked`，不要报成用例失败 |

## 默认执行顺序

1. 语法和 ESLint 检查（改动路径）；
2. 环境自检四项（可达 / 鉴权 / 版本门控 / 数据同源）；
3. 变更接口的单文件测试；
4. 对本地接口执行本地测试；
5. 对远程接口执行目标 Smoke 测试；
6. 用户明确要求时再执行完整 Smoke/All/DB 测试。

涉及支付、领取邮件、绑定、解绑、同步数据或兑换码时，执行前必须提醒其可能消耗或改变远程测试数据。若用户没有明确授权，先完成静态检查和非破坏性测试，不主动重复执行消耗性测试。

## CI 集成

CI 只跑可重复、无一次性资源的用例；真实环境报告用手动触发。

- 工作流：[.github/workflows/api-report.yml](../../../.github/workflows/api-report.yml)，`workflow_dispatch` 触发，输入 `profile` 与 `path`；
- 命令：`TEST_PROFILE=<profile> npm run test:report:dir --path="testcases/<目录>"`；
- 产物：`allure-report/` 以 artifact 上传（`if: always()`，保留 14 天），测试失败也要拿到报告，再由最后一步把 job 标红；
- 凭据：`API_BASE_URL`、`API_TOKEN` 等只从仓库 Secrets 读取，禁止写进工作流或提交 `.env.*`；
- 消耗类开关（`REDEEM_ALLOW_REDEEM`、`ROLLBACK_E2E`）在 CI 中保持关闭，需要时人工本地执行。
