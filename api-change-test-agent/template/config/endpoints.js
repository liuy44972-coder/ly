// 集中维护被测接口路径：新增接口只改这里，测试用例只引用键名。
module.exports = {
  health: '/health',
  login: '/api/user/login',
  notice: '/api/notice',
  info: '/api/user'
};
