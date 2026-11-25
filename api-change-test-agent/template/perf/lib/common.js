// 负载模型与阈值：取值为「接口专属变量 → 项目级变量 → 默认值」，不拍脑袋。
export function firstEnv(...keys) {
  for (const key of keys) {
    if (__ENV[key] !== undefined && __ENV[key] !== '') return __ENV[key];
  }
  return undefined;
}

export function parseStages(text) {
  return text
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [duration, target] = pair.split(':');
      return { duration: duration.trim(), target: Number(target) };
    });
}

export function buildOptions(api) {
  const smoke = __ENV.PERF_SMOKE === 'true';
  const apiKey = api.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const p95 = Number(firstEnv(`PERF_${apiKey}_P95_MS`, 'PERF_P95_MS') || 800);
  const p99 = Number(firstEnv(`PERF_${apiKey}_P99_MS`, 'PERF_P99_MS') || 1500);

  const vus = Number(firstEnv('PERF_VUS') || (smoke ? 1 : 10));
  const duration = firstEnv('PERF_DURATION') || (smoke ? '5s' : '1m');
  const rate = Number(firstEnv('PERF_RATE') || 0);
  const stages = firstEnv('PERF_STAGES');

  let scenario;
  if (smoke) {
    scenario = { executor: 'constant-vus', vus: 1, duration };
  } else if (stages) {
    scenario = { executor: 'ramping-vus', startVUs: 0, stages: parseStages(stages) };
  } else if (rate > 0) {
    scenario = {
      executor: 'constant-arrival-rate',
      rate,
      timeUnit: '1s',
      duration,
      preAllocatedVUs: Number(firstEnv('PERF_PRE_VUS') || Math.max(rate, 10)),
      maxVUs: Number(firstEnv('PERF_MAX_VUS') || Math.max(rate * 2, 20))
    };
  } else {
    scenario = { executor: 'constant-vus', vus, duration };
  }

  return {
    scenarios: { [api]: scenario },
    thresholds: {
      [`http_req_duration{api:${api}}`]: [`p(95)<${p95}`, `p(99)<${p99}`],
      [`http_req_failed{api:${api}}`]: ['rate<0.01'],
      [`checks{api:${api}}`]: ['rate>0.99']
    },
    summaryTrendStats: ['avg', 'min', 'med', 'p(95)', 'p(99)', 'max']
  };
}
