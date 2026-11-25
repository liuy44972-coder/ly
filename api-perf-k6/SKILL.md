---
name: "api-perf-k6"
description: "基于 k6 的接口性能测试：选择场景、配置负载模型与阈值、执行冒烟/容量压测、解读结果并输出报告。用户要求做接口性能测试、压测、容量评估、性能基线或阈值校准时调用。"
---

# 接口性能测试（k6）

## 目标

针对当前项目的 mc / mf / nova 三个测试环境，使用已有的 k6 场景脚本完成接口级性能测试，产出可判定的结果：

- 冒烟验证：确认接口在真实环境可压、参数与鉴权正确
- 基准测试：固定压力下记录 p95/p99、错误率、业务成功率
- 容量/阶梯测试：找到吞吐拐点，判断 VU 或 QPS 是否够用
- 阈值门禁：用真实阈值结果判断本次压测是否通过

不把「单接口 smoke 结果」当作容量结论，也不把压测脚本当成功能测试。

## 触发条件

用户提出以下需求时调用：

- 对某个接口/项目做性能测试、压测、benchmark
- 评估接口容量、并发能力、性能基线
- 校准或调整性能阈值
- 分析压测结果是否达标

## 项目现状

- 入口脚本：[scripts/perf.sh](file:///Users/ttwj/Desktop/APIauto/scripts/perf.sh)，按 `TEST_PROFILE` 加载 `.env` + `.env.<profile>`，按场景执行 k6
- 公共能力：[perf/lib/common.js](file:///Users/ttwj/Desktop/APIauto/perf/lib/common.js)（负载模型、阈值、校验、汇总）、[perf/lib/http.js](file:///Users/ttwj/Desktop/APIauto/perf/lib/http.js)（统一请求）、[perf/lib/auth.js](file:///Users/ttwj/Desktop/APIauto/perf/lib/auth.js)（登录/多账号）、[perf/lib/login.js](file:///Users/ttwj/Desktop/APIauto/perf/lib/login.js)
- 场景目录 `perf/`：`configs`、`notice`、`privacy`、`ping`、`info`、`mail`、`queryDecoded`（仅 mf）、`rankList`（仅 mf/nova）、`login`（不进入 `all`）
- 结果目录 `perf-results/`，文件名 `<profile>-<api>-<时间戳>.json`

### 可压测范围

只压只读接口。以下接口不纳入性能测试：

- 写接口：`message`、`syncUser`、`binding`/`unbinding`、`resetUser`、`claimMail`、`redeemCode`、`pay`/`payV2`/`payV3`、`rankJoin`、`rankIncr`
- 运维接口：`gmUpdateDecoded`、`health`
- 环境当前不可用：mc 无 `/api/mail` 路由（实测 404）；mf/nova 的 `rankList` 返回业务码 999（功能用例同样失败）。两者默认从 `all` 跳过，可用单场景命令复现，不要为了「跑通」放宽断言。

## 工作流程

```text
确认项目与目标 → 核对参数来源 → 选择负载模型 → 冒烟 → 正式压测 → 解读结果 → 校准阈值/出报告
```

### 1. 确认项目与环境

1. 明确 `TEST_PROFILE`（`mc` / `mf` / `nova`），一个进程只压一个项目，不要混跑。
2. 确认基址：读取 `.env.<profile>` 的 `API_BASE_URL`，只输出域名，不输出密钥。
3. 出现 `k6: command not found` 时先补 PATH：`export PATH="$HOME/.local/bin:$PATH"`。

### 2. 核对参数来源

压测参数必须与功能用例一致，不能拍脑袋：

- 路径以 [config/endpoints.js](file:///Users/ttwj/Desktop/APIauto/config/endpoints.js) 为准
- 版本、活动 ID、userId 等取自对应 `testcases/<profile>-all/*.spec.js` 的默认值与 `.env.<profile>`
- 取值顺序为「接口专属变量 → 项目级 `CLIENT_VERSION`/`API_VERSION` → 脚本默认值」，由 `firstEnv()` 实现
- 鉴权优先 `PERF_TOKENS`/`PERF_COOKIES`，未配置时 setup 阶段自动登录
- 缺少 userId、活动 ID、Token 等真实数据时必须询问用户，不能编造

### 3. 选择负载模型

| 目标 | 配置 | 说明 |
|---|---|---|
| 冒烟 | `PERF_SMOKE=true`（`npm run perf:smoke`） | 1 VU、默认 5s，只验通路和业务码 |
| 固定并发 | `PERF_VUS=N PERF_DURATION=60s` | `constant-vus`，用于基准 |
| 目标 QPS | `PERF_RATE=N PERF_DURATION=60s` | `constant-arrival-rate`，需设 `PERF_PRE_VUS`/`PERF_MAX_VUS`，并校验 `dropped_iterations==0` |
| 阶梯/容量 | `PERF_STAGES="10s:10,3m:50,1m:0"` | 自定义曲线，用于找拐点 |

正式压测前先跑一次冒烟；冒烟不通过不要进入加压阶段。

### 4. 执行

```bash
export PATH="$HOME/.local/bin:$PATH"

# 冒烟（三项目分别执行）
TEST_PROFILE=mc npm run perf:smoke
TEST_PROFILE=mf npm run perf:smoke
TEST_PROFILE=nova npm run perf:smoke

# 正式压测：单场景或全部
TEST_PROFILE=mf PERF_VUS=20 PERF_DURATION=3m npm run perf:configs
TEST_PROFILE=nova PERF_RATE=50 PERF_DURATION=5m npm run perf:all
```

脚本按场景累计失败数，最后统一返回非零退出码；单个场景失败不会中断后续场景。

### 5. 解读结果

必须基于 `handleSummary` 产出的汇总，不使用 `--summary-export` 的阈值布尔值（不可信）。

判定顺序：

1. `checks{api}` 通过率 > 99%：HTTP 与业务 `code` 都成功
2. `http_req_failed{api}` < 1%
3. `p95` / `p99` 是否在阈值内
4. `PERF_RATE>0` 时 `dropped_iterations==0`：否则说明 VU 不足，实际吞吐没达到目标速率

结论必须区分：

- 接口错误（4xx/5xx、业务码非 200）：属于功能或环境问题，先修通再谈性能
- 性能不达标：延迟或错误率超阈值，需结合 VU/QPS、服务端监控判断瓶颈
- 环境噪声：测试环境共享、跨地域 RTT 约 200ms，同接口多次 p95 波动可达 30%，单次结果不能定性

### 6. 阈值校准

- 默认 `p95<800ms`、`p99<1500ms`、失败率 `<1%`、`checks>99%`，已按三项目冒烟基线校准
- 接口级覆盖：`PERF_<API>_P95_MS`，如 `PERF_CONFIGS_P95_MS=500`（api 名转大写下划线）
- 校准依据是「合格基线值 × 1.5~2 预留量」，不是压低阈值让测试通过
- 阈值调整后必须重跑一次冒烟，确认所有场景仍可通过

## 输出格式

报告使用中文，结构如下：

1. **测试条件**：项目、基址、负载模型（VU/QPS/时长）、是否冒烟
2. **结果汇总表**

| 接口 | 请求数 | p95 | p99 | 失败率 | checks | 阈值 |
|---|---:|---:|---:|---:|---:|---|

3. **未通过项**：逐条列出指标、实际值与阈值
4. **结论**：是否满足目标；不满足时给出可能瓶颈（需结合服务端监控确认）
5. **环境问题**：接口不可用、参数缺失、鉴权失败等，与性能问题分开表述
6. **结果文件**：`perf-results/<profile>-<api>-<时间戳>.json`

不得在报告中输出 Token、Cookie、Authorization、GM_SIGN、支付凭据或完整请求头。

## 安全与数据隔离

- 只压测试环境，不连接生产地址
- 只压只读接口，禁止对写接口加压
- 不伪造用户 ID、活动 ID、令牌或业务码
- 压测前确认环境允许施压（共享测试环境建议低峰执行）
- 不为了通过阈值而删除场景、放宽断言或忽略失败

## 默认不做

除非用户明确要求：

- 不新增写接口压测场景
- 不引入 k6 之外的压测框架
- 不修改被测服务代码
- 不创建额外文档文件
