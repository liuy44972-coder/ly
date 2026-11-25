# 数据库断言

需要校验落库结果时，复用 [testcases/db/_readonly.js](../../../testcases/db/_readonly.js)，不要新建连接或写操作。

断言至少覆盖以下维度，缺哪一项要在待确认项里说明原因：

1. **状态字段**：单据 `status` 及其时间戳（`applyingAt`/`appliedAt`/`cancelledAt`）确有写入；
2. **业务标识位**：如 `state.pendingRollbackId` 在终态后被清除（断言 `toBeUndefined()`，而不是断言为 `null`）；
3. **关键数值**：如 `increment` 必须为当前值 +100，避免与客户端增量混用；
4. **整文档替换 vs 字段合并**：用 `cust` 等对象字段的深度相等断言区分两种语义；
5. **明确不回退的字段**：如 `paid`/`amount` 必须保持落库前的值。

只读约束：

- 新增集合/字段需先加入 `_readonly.js` 的 `PROJECTION` 白名单；
- 查询必须带 `maxTimeMS`，连接使用只读配置；
- 断言失败只报告差异，不自动改写数据；
- 校验前先确认 `MONGODB_DB` 与被测 API 环境是同一套数据，对不上时标记 `blocked` 而不是断言失败。
