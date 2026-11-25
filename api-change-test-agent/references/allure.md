
# Allure 报告与展示

接口变更交付默认走完整闭环：**写文字用例 → 写/改脚本 → 执行 → 生成并展示 Allure 报告**。执行通过后直接产出报告，不需要用户再提一次。

## 1. 生成命令

一条命令完成「清理 → 执行 → 注入请求响应 → 生成报告」：

```bash
TEST_PROFILE=<nova|mc|mf> npm run test:report:dir --path="testcases/<需求目录>"
```

脚本内部顺序：

1. 清理历史 `allure-results`、`allure-report`，避免新旧结果混在同一个报告里；
2. `jest <path> --runInBand --reporters=default --reporters=jest-allure2-reporter`；
3. `node scripts/enrich-allure.js`，把采集日志里的请求/响应写成「请求 / 响应」步骤（附件「请求参数」「响应内容」），把 `check()` 记录的断言写成「断言：xxx」步骤（附件「断言详情」含 matcher/expected/actual）；
4. `npm run allure:generate`，产出 `allure-report/`。

要点：

- 步骤之间用 `;` 而非 `&&` 串联，**测试失败也要生成报告**，否则最需要看报告的场景反而没有报告；
- 需要覆盖率时不走该脚本（脚本以测试退出码结束），直接执行 `npx jest <path> --coverage --runInBand --reporters=default --reporters=jest-allure2-reporter`，再依次 `node scripts/enrich-allure.js`、`npm run allure:generate`；
- 已有专用脚本（`test:smoke:report:nova|mc|mf`、`test:pay-optimization:report`）时优先复用，不要另建；
- 只做静态检查、不执行用例时，不生成报告。

## 2. 展示方式

1. 首选给出本地报告链接，用 `computer://` 协议，便于直接点开：`computer://<项目根目录>/allure-report/index.html`；
2. 需要交互式浏览（筛选、用例详情）时，后台启动 `npm run allure:open`，把终端输出的 `http://localhost:<port>` 返回给用户，并说明可用 `Ctrl+C` 停止；
3. `allure` 命令缺失或端口被占用时，回退为静态链接，并提示执行 `npm run allure:setup` 检查环境；
4. 报告重新生成后用例 uuid 会变化，旧 `allure open` 进程打开的详情页会 404：先结束旧的 `allure open` 进程再启动，用新端口访问。

## 3. 环境依赖与排障

Allure CLI 依赖 Java，本项目通过 `allure-commandline` 调起 java：

- `JAVA_HOME` 为空时会回退到 PATH 里的 `java`；本机 `/usr/bin/java` 可能解析到不可用的 JDK，报 `dyld: Library not loaded: @rpath/libjli.dylib`；
- 因此 `allure:generate` / `allure:open` 已内置兜底：`JAVA_HOME` 未设置且 `/opt/homebrew/opt/openjdk` 存在时自动使用它；其他机器请自行 `export JAVA_HOME=<JDK 路径>`；
- 报告目录未生成时先看 `allure generate` 的输出，不要用 `node -e` 的 `ENOENT` 报错反推测试结果；
- 沙箱环境里 java 不可用时，把 `allure generate allure-results --clean -o allure-report` 放到非沙箱执行，命令与脚本内一致。

验证过一次的产出：`allure-report/index.html` + `data/`、`widgets/`、`history/`，`widgets/summary.json` 里可读到 `passed/skipped/total` 统计。

## 4. 报告质量要求

- 报告内必须同时包含变更接口的成功用例与异常用例，失败用例能看到脱敏后的请求/响应，便于直接定位；
- **请求参数必须出现在用例正文**：每条用例展开后应看到 `请求：METHOD URL`（含 query、headers、body）与 `响应：HTTP 200 · code=xxx` 两个步骤，附件分别叫「请求参数」「响应内容」；只把参数写成测试级附件时，报告页面上几乎看不到，等于没加；
- **断言必须能在报告里逐条看到**：统一用 `helper/assertions.js` 的 `check(actual, '断言说明')` 代替裸 `expect`，报告中生成「断言：xxx」步骤，附件「断言详情」含 matcher、expected、actual，失败时带 Jest 错误信息：

  ```js
  const { check } = require('../../helper/assertions');

  check(response.body.code, '业务返回码为 200').toBe(responseCodes.SUCCESS);
  check(updatedUser.stage, 'fieldPatch.stage 回显提交值').toEqual(fieldPatch.stage);
  check(updatedUser.reason, '响应不包含 reason 字段').toBeUndefined();
  ```

  `toHaveLength`、`toContain` 等常用链式断言同样支持；集合校验先汇总异常项再断言一次，避免逐键循环产生几百条步骤：

  ```js
  const invalid = metas.filter(([key]) => !validEncoding.includes(...)).map(([key]) => key);
  check(invalid, 'custMeta 每项 encoding 取值合法').toEqual([]);
  ```

- 未执行到请求的用例（skipped、前置缺失、在发请求前就断言失败）不会产生请求步骤，这是正常现象，需在待确认项说明原因，不要伪造步骤；
- 报告中不得出现 Token、Cookie、`sign` 等明文，脱敏依赖 `helper/allure-request.js` 与 `scripts/enrich-allure.js`，不得为了可读性关闭脱敏；
- 因前置数据不满足（版本门槛、单据状态、一次性资源已用）而跳过的用例，在报告中呈现为 skipped，并在待确认项说明原因，**不得为了报告好看而强行执行或改断言**；
- 报告生成失败时，如实报告失败原因（依赖缺失、报告目录权限、allure 版本），不要把「报告没出来」记成「用例通过」。
