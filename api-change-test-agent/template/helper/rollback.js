// 写操作数据还原：按注册顺序倒序执行收尾动作，单个失败不阻断其余收尾。
// 用法：await rollback.runAll(); 或在 afterAll 中调用。

const tasks = [];

// 注册一个收尾动作；label 仅用于失败定位。
function register(label, fn) {
  tasks.push({ label, fn });
}

// 倒序执行并清空；返回 { done, failed } 便于用例断言收尾结果。
async function runAll() {
  const failed = [];
  let done = 0;
  while (tasks.length > 0) {
    const { label, fn } = tasks.pop();
    try {
      await fn();
      done += 1;
    } catch (error) {
      failed.push({ label, message: error.message });
    }
  }
  return { done, failed };
}

function clear() {
  tasks.length = 0;
}

module.exports = { register, runAll, clear };
