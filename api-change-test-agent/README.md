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
├── README.md                        本文件
├── template/                        最小可运行工程骨架（克隆后可直接复制使用）
│   ├── bootstrap.sh                 复制骨架到目标项目并生成 .env
│   ├── package.json                 Jest / Allure / Supertest 依赖与 scripts
│   ├── jest.config.js               测试根目录与 setup 配置
│   ├── .env.example                 环境变量模板
│   ├── config/                      endpoints、responseCodes、testConfig、jest.setup
│   ├── helper/                      apiClient、auth、assertions
│   ├── fixtures/                    非敏感固定测试数据
│   ├── scripts/                     selfcheck.js、check-case-index.js
│   ├── testcases/dev- smoke/        冒烟示例用例（notice）
│   └── tests/cases/                 用例索引表骨架
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

## 一条命令安装

在克隆下来的仓库根执行，等价于「放入 `.trae/skills/` + 复制工程骨架 + 装依赖 + 自检」：

```bash
bash install.sh /path/to/your-project
```

- 可选参数：`--no-install` 跳过依赖安装，`--no-skeleton` 只装 skill 不建骨架
- 已存在的文件不会被覆盖，脚本可重复执行
- `.env` 的 `API_BASE_URL` 仍是占位值时自动跳过自检，避免误报失败
- 同时安装另外 4 个 skill：`api-coverage`、`api-perf-k6`、`senior-qa-brain`、`api-case-to-jest-supertest`

## 快速开始（3 步，手动）

克隆后不需要宿主项目已有脚手架，`template/` 自带最小可运行工程：

```bash
# 1. 复制骨架到项目根（已存在的文件不会被覆盖）
bash .trae/skills/api-change-test-agent/template/bootstrap.sh /path/to/your-project

# 2. 安装依赖
cd /path/to/your-project && npm install

# 3. 填基址后自检（需至少配置 API_BASE_URL）
#    编辑 .env：API_BASE_URL=https://your-test-host.example.com
npm run selfcheck
```

三项都通过后即可跑示例用例与出报告：

```bash
npm run test:smoke      # 跑 testcases/dev- smoke
npm run test:report     # 执行并生成 Allure 结果
npm run allure:open     # 打开 Allure 报告
```

复制后需要按实际项目替换三处：`config/endpoints.js` 的接口路径、`config/responseCodes.js` 的业务码、`.env` 的基址与鉴权。

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

## 宿主项目依赖（有则复用，无则用 template）

阶段零会先探测工程形态，三种模式走同一套流程：

| 形态 | 判定 | 处理 |
|---|---|---|
| 完整 | endpoints / apiClient / jest.config 全在 | 直接复用宿主约定 |
| 精简 | 有部分脚手架但不完整 | 只补缺失部分，`scripts` 合并不覆盖 |
| 自包含 | 无任何脚手架 | 复制 `template/` 骨架，用骨架自带脚本自检与校验索引 |

宿主工程具备以下约定时可直接复用（移植到其他项目时对应替换）：

| 约定 | 说明 |
|---|---|
| `config/endpoints.js` / `config/responseCodes.js` | 接口路径与业务码常量的唯一来源 |
| `config/testConfig.js` + `.env.<profile>` | `TEST_PROFILE=nova\|mc\|mf` 决定加载的环境配置 |
| `helper/apiClient.js` / `helper/auth.js` | 请求客户端与运行时 Token/Cookie |
| `helper/assertions.js` / `helper/allure-request.js` | 断言包装与 Allure 附件脱敏（后者模板未提供，按需自建） |
| `fixtures/` | 非敏感固定测试数据 |
| `testcases/<需求>/` + 环境目录薄挂载 | 用例分层与维护点 |
| `tests/cases/接口及接口用例汇总.md` | 全仓用例索引 |
| npm scripts | `selfcheck`（环境自检）、`cases:check` / `cases:check:strict`（索引校验）、`test:report:dir`（生成报告） |

缺少对应 npm script 时：自包含模式用 `node scripts/selfcheck.js`、`node scripts/check-case-index.js`；精简模式跳过并在输出中标注「未自检」/「索引未校验」。

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
| 从零搭最小工程骨架 | [template/README.md](template/README.md) |

完整约束与阶段细节见 [SKILL.md](SKILL.md)。
