# 状态机与状态门控

当接口存在业务状态流转时，必须先画出「状态 × 操作」矩阵，再落用例；不要只按参数维度设计。

要求：

- 每个状态只保留一个合法出口，非法迁移必须断言错误码；
- 终态（如 `applied`/`cancelled`）的接口调用必须断言拒绝，而不是「不做校验」；
- 幂等操作要断言重复调用前后数据不变；
- 文档未定义的状态组合标记 `blocked`，不要靠实测结果反向补文档。

示例（存档回退，见 [helper/rollback.js](../../../../helper/rollback.js)）：

| 当前状态 | `rollback/fetch` | `rollback/confirm` |
| --- | --- | --- |
| 无单据 | 710 | 710 |
| `published` | 成功，迁移到 `applying` | 711（未拉取不得落库） |
| `applying` | 成功且幂等 | 成功，迁移到 `applied`，`data` 为 `""` |
| `applied` | 710 / 711 | 710 / 711 |
| `cancelled` | 710 / 711 | 710 / 711 |

状态由人工或 GM 网关提前准备，**用例侧不允许自己建单**。状态通过环境变量表达，用例按状态决定执行或跳过：

```js
const activeTest = hasActiveOrder() ? test : test.skip;
const noOrderTest = orderState() === 'none' ? test : test.skip;
```

跳过的用例必须保留 ID 和文本用例，不允许为了让套件「全绿」而删除。
