# api-change-test-agent

接口变更自动化测试智能体（Trae Skill）。把接口改动文档、OpenAPI / Apipost 导出、curl、抓包、截图或口述变更，转换成可审查、可执行的 Jest + Supertest 用例，执行后生成 Allure 报告并给出失败归因。

## 能力边界

- 输入：接口改动文档、PRD、OpenAPI/Swagger、Apipost/Postman 导出、curl、抓包、截图、代码 diff / PR、口头说明
- 输出：变更清单、场景矩阵、文本用例（Markdown）、Jest 脚本、执行结果、Allure 报告、失败归因表与待确认项
- 不做：未经授权修改断言/用例去凑通过、编造路径与错误码、执行生产环境测试、数据库写操作

## 工作流

```text
阶段零 输入适配与代码校准   识别输入类型，git diff 校准文档与代码，定 L1/L2/L3 档位
阶段一 解析变更             变更清单（方法/路径/Query/Body/鉴权/响应/错误码/数据）
阶段二 影响分析             endpoints、responseCodes、鉴权、fixtures、测试分层、基址归属
阶段三 契约探测             只读优先的最小探测，按场景组计预算，结果标注「实测确认」
阶段四 场景矩阵             success / missing-param / auth / method / boundary / state-machine / database …
阶段五 修改测试             文本用例定稿 → 自评审 → 落成 Jest 脚本；同步全仓用例索引
阶段六 环境与执行           四项自检（基址/鉴权/版本/数据）→ 串行执行 → 失败分层定位
阶段七 报告与分析           生成 Allure 报告、归因表、结论行；真实缺陷出缺陷单
```

变更规模分级：`L1` 单字段/单错误码可裁剪矩阵；`L2` 单接口契约变化走完整流程；`L3` 跨接口或含状态流转，追加状态机矩阵与 DB 断言。

## 目录结构

```text
api-change-test-agent/
├── SKILL.md                         主文件：角色、阶段约束、DoD、安全规则
└── references/
    ├── allure.md                    Allure 报告生成、展示与质量要求
    ├── db-assertions.md             只读数据库断言的维度与白名单
    ├── defect-report.md             缺陷单格式（严重级、复现概率、证据）
    ├── env-gates.md                 环境门控变量与跳过原因规范
    ├── execution.md                 执行命令、自检表、CI 集成
    ├── failure-triage.md            失败分层定位与重试边界
    ├── state-machine.md             状态 × 操作矩阵写法
    ├── test-writing.md              断言写法、写操作数据还原
    ├── text-case-design.md          用例 ID 规范、文档骨架、自评审清单
    └── vendor/                      三个下游能力的内嵌副本
        ├── senior-qa-brain/         用例设计方法论
        ├── api-case-to-jest-supertest/  文本用例 → Jest 代码
        └── api-coverage/            覆盖率与缺口分析
```

## 安装与触发

把整个目录放到 Trae 的项目技能目录：

```text
<project>/.trae/skills/api-change-test-agent/
```

或放到全局技能目录供所有项目使用。Trae 依据 `SKILL.md` 的 `description` 自动匹配触发，也可以用自然语言显式要求，例如：

- 「这个接口改了，帮我看下要补哪些用例」
- 「按这份接口文档生成 Jest 用例并跑一遍出 Allure 报告」
- 「pay 接口新增了错误码 695，补测试并验证」

## 内嵌能力（vendor）

本 skill 自带三个下游能力的内嵌副本，只加载本 skill 即可走完整流程；三个独立 skill 仍然保留，可单独调用。

| 阶段 | 能力 | 内嵌副本 | 可独立调用的 skill |
|---|---|---|---|
| 阶段四 / 5.6 | 用例设计方法论 | `references/vendor/senior-qa-brain/` | `senior-qa-brain` |
| 阶段五 | 文本用例转 Jest + Supertest | `references/vendor/api-case-to-jest-supertest/` | `api-case-to-jest-supertest` |
| 覆盖率与缺口 | 覆盖率统计与缺口分析 | `references/vendor/api-coverage/` | `api-coverage` |

规则：内嵌副本禁止就地修改，改动落在独立 skill 目录后用宿主项目的 `scripts/sync-skill-vendor.sh` 同步，`--check` 用于漂移检查。

## 关键约束

- 有疑问先问：方法/路径/字段/业务码/鉴权/前置数据不明时列 `TODO: 待确认`，不按常见约定补全
- 探测预算：契约类累计 ≤ 2 次、请求头与 Content-Type 类 ≤ 2 次、单接口总额 ≤ 6 次，耗尽即停并说明缺哪份文档
- 单一维护点：按需求聚合的目录是唯一维护点，`<环境>- smoke` / `<环境>-all` 只做 `require` 薄挂载，不复制用例
- 串行执行：远程用例加 `--runInBand`，禁止 `test.concurrent`，禁止同时跑多个环境
- 一次性资源：兑换码、单据、邮件等默认关闭，执行前需授权；同一资源失败后禁止原值重试
- 失败只报告：断言不通过时不得私自改断言、用例、fixtures 或门控，先给归因与选项
- 脱敏：不输出 Token、Cookie、支付凭证等敏感值，日志与报告附件必须打码

## 宿主项目依赖

本 skill 假定宿主工程已经具备以下约定（移植到其他项目时需要对应替换）：

| 约定 | 说明 |
|---|---|
| `config/endpoints.js` / `config/responseCodes.js` | 接口路径与业务码常量的唯一来源 |
| `config/testConfig.js` + `.env.<profile>` | `TEST_PROFILE=nova\|mc\|mf` 决定加载的环境配置 |
| `helper/apiClient.js` / `helper/auth.js` | 请求客户端与运行时 Token/Cookie |
| `helper/assertions.js` / `helper/allure-request.js` | 断言包装与 Allure 附件脱敏 |
| `fixtures/` | 非敏感固定测试数据 |
| `testcases/<需求>/` + 环境目录薄挂载 | 用例分层与维护点 |
| `tests/cases/接口及接口用例汇总.md` | 全仓用例索引 |
| npm scripts | `selfcheck`（环境自检）、`cases:check` / `cases:check:strict`（索引校验）、`test:report:dir`（生成报告） |

## 参考文档

| 触发情形 | 读取 |
|---|---|
| 生成或排查 Allure 报告 | [references/allure.md](references/allure.md) |
| 接口存在业务状态流转 | [references/state-machine.md](references/state-machine.md) |
| 校验落库结果 | [references/db-assertions.md](references/db-assertions.md) |
| 远程用例失败，判根因或决定是否重试 | [references/failure-triage.md](references/failure-triage.md) |
| 判定为服务真实缺陷，出缺陷单 | [references/defect-report.md](references/defect-report.md) |
| 执行远程用例、写 CI 或排查环境 | [references/execution.md](references/execution.md) |
| 写用例 ID、文档骨架或做自评审 | [references/text-case-design.md](references/text-case-design.md) |
| 配置或排查门控变量 | [references/env-gates.md](references/env-gates.md) |
| 写用例正文、断言、数据还原 | [references/test-writing.md](references/test-writing.md) |

完整约束与阶段细节见 [SKILL.md](SKILL.md)。
