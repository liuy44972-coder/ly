// 只读数据库访问：仅允许按 PROJECTION 白名单取字段，禁止写操作与全表扫描。
// 未配置 MONGODB_URI 或未安装 mongodb 依赖时调用会抛出明确错误，
// 用例应捕获后标记 blocked，而不是把数据库不可用当作接口失败。

// 集合 → 允许读取的字段白名单；新增字段先在此登记。
const PROJECTION = {
  users: ['_id', 'userId', 'status', 'updatedAt'],
  orders: ['_id', 'orderId', 'userId', 'status', 'amount', 'updatedAt']
};

function buildProjection(collection, fields) {
  const allowed = PROJECTION[collection];
  if (!allowed) {
    throw new Error(`集合 ${collection} 未在 testcases/db/_readonly.js 的 PROJECTION 白名单中登记`);
  }
  const picked = fields || allowed;
  const invalid = picked.filter((field) => !allowed.includes(field));
  if (invalid.length > 0) {
    throw new Error(`字段不在白名单内: ${invalid.join(', ')}`);
  }
  return Object.fromEntries(picked.map((field) => [field, 1]));
}

// 只读查询：filter 必须含业务主键，避免全表扫描。
async function findOne(collection, filter, fields) {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('未配置 MONGODB_URI，数据库断言应标记 blocked');
  let MongoClient;
  try {
    // eslint-disable-next-line global-require
    ({ MongoClient } = require('mongodb'));
  } catch {
    throw new Error('未安装 mongodb 依赖，数据库断言应标记 blocked');
  }
  if (!filter || Object.keys(filter).length === 0) {
    throw new Error('数据库断言必须带业务主键过滤条件');
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    return client
      .db(process.env.MONGODB_DB)
      .collection(collection)
      .findOne(filter, { projection: buildProjection(collection, fields) });
  } finally {
    await client.close();
  }
}

module.exports = { PROJECTION, buildProjection, findOne };
