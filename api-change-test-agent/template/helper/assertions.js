// 统一断言入口：默认直接使用 Jest expect，需要写入 Allure 步骤时在此扩展。
function check(actual, label = '') {
  if (label && typeof expect.getState === 'function') {
    expect.getState().currentAssertionLabel = label;
  }
  return expect(actual);
}

module.exports = { check };
