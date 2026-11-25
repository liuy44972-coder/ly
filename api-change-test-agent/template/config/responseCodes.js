// 业务码常量：按被测项目实际约定补充，新增错误码时同步加注释说明语义。
module.exports = {
  // 请求处理成功。
  SUCCESS: 200,

  // 参数校验错误。
  PARAMETER_MISSING_ERROR: 601,
  PARAMETER_FORMAT_ERROR: 602,
  PARAMETER_INVALID_VALUE: 606,

  // 客户端和资源版本校验错误。
  VERSION_LOWER_SERVER: 608,
  RES_VERSION_LOWER_SERVER: 609,

  // 账号令牌校验错误。
  ACCOUNT_TOKEN_EXPIRE: 611,
  ACCOUNT_TOKEN_MISSING: 612,
  ACCOUNT_TOKEN_FORMAT: 613
};
