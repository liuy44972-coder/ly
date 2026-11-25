# 门控与前置变量清单

新增门控变量时同步更新本表与 `.env.example`，并在 5.3 注明「前置缺失必须显式跳过并输出原因」。敏感值只在本地 `.env.<profile>` 或 CI Secrets 中提供，禁止写入代码、文档或日志。

| 变量 | 作用 | 默认 | 不满足时的影响 |
|---|---|---|---|
| `TEST_PROFILE` | 选择环境，读取 `.env.<profile>` | `.env.test` | 走默认环境，可能与预期环境不符 |
| `API_BASE_URL` | 被测服务基址 | `.env.example` 中的本地地址 | 全部远程用例不可执行 |
| `API_TOKEN` / `API_USER` / `API_PASS` | GM 平台类接口凭据 | 空 | 需要登录态的用例跳过或返回 `611` |
| `MONGODB_URI` / `MONGODB_DB` | DB 断言连接（只读、非生产） | 空 | DB 断言标 `blocked` |
| `TEST_USER_ID` / `TEST_FACEBOOK_ID` / `TEST_MAIL_ID` | 通用测试账号标识 | 空 | 依赖真实用户的用例跳过 |
| `GM_SIGN` | 游戏服公共接口签名 | 空 | 所有需业务校验的 GM 用例跳过 |
| `GM_TEST_USER_ID` | GM 解码接口测试用户，缺省回退 `TEST_USER_ID` | 空 | 涉及用户数据的用例跳过 |
| `GM_ALLOW_WRITE` | `updateDecoded` 等写操作总开关 | `false` | 写操作用例全部跳过 |
| `GM_TIMEOUT_MS` | 单请求超时 | `15000` | 仅影响等待时长 |
| `REDEEM_CODE` / `REDEEM_ALLOW_REDEEM` | 兑换码与一次性资源开关 | 空 / `false` | 成功兑换用例跳过 |
| `ROLLBACK_ORDER_STATE` / `ROLLBACK_E2E` / `ROLLBACK_DEVICE_CASE` | 存档回退前置状态与消耗型用例开关 | `none` / `false` / `false` | 对应状态门控用例跳过 |

约定：

- 写操作、一次性资源、会改变设备或账号状态的门控默认关闭，必须显式开启且确认测试环境；
- 门控不满足一律 `test.skip` 并输出原因，禁止用假数据或改断言制造通过；
- 报告里出现成片 skipped 时，先核对本表，再怀疑用例设计。
