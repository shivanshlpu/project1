// ==============================================================================
// AHTRI FFA — Standalone Node.js Concurrency Benchmark
// Runs staged load tests measuring requests/sec, p50, p95, p99 latencies, and error rates.
// Usage: node backend/test/benchmark-concurrency.js [http://localhost:3000]
// ==============================================================================

const http = require('http');
const https = require('https');
const { URL } = require('url');

const TARGET_URL = process.argv[2] || process.env.API_BASE_URL || 'http://localhost:3000';
const parsedUrl = new URL(TARGET_URL);
const isHttps = parsedUrl.protocol === 'https:';
const client = isHttps ? https : http;

// Persistent HTTP keep-alive agent to maximize throughput
const agent = new (isHttps ? https.Agent : http.Agent)({
  keepAlive: true,
  maxSockets: 500,
});

function sendRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const reqHeaders = {
      'Content-Type': 'application/json',
      'x-user-id': 'usr-mr-01',
      ...headers,
    };
    if (data) {
      reqHeaders['Content-Length'] = Buffer.byteLength(data);
    }

    const options = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path,
      method,
      headers: reqHeaders,
      agent,
      timeout: 10000,
    };

    const req = client.request(options, (res) => {
      res.on('data', () => {}); // Consume body
      res.on('end', () => {
        const latency = Date.now() - start;
        resolve({
          statusCode: res.statusCode,
          latency,
          error: null,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        statusCode: 504,
        latency: Date.now() - start,
        error: 'TIMEOUT',
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 0,
        latency: Date.now() - start,
        error: err.message,
      });
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

function calculatePercentiles(latencies) {
  if (latencies.length === 0) return { p50: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = Math.round(sum / sorted.length);
  return { p50, p95, p99, avg, min: sorted[0], max: sorted[sorted.length - 1] };
}

async function runStage(stageName, concurrency, totalRequests) {
  console.log(`\n======================================================`);
  console.log(`Running: ${stageName}`);
  console.log(`Target: ${TARGET_URL} | Concurrency: ${concurrency} | Total: ${totalRequests}`);
  console.log(`======================================================`);

  const latencies = [];
  let successful = 0;
  let failed = 0;
  let inFlight = 0;
  let completed = 0;

  const startTime = Date.now();

  const endpoints = [
    { path: '/tasks/my', method: 'GET', weight: 50 },
    { path: '/doctors', method: 'GET', weight: 20 },
    { path: '/attendance/today', method: 'GET', weight: 12 },
    {
      path: '/tasks/task-01/start',
      method: 'POST',
      body: JSON.stringify({ latitude: 23.2968, longitude: 81.3533, gps_accuracy_m: 10 }),
      weight: 13,
    },
    {
      path: '/attendance/punch-in',
      method: 'POST',
      body: JSON.stringify({
        latitude: 23.2968,
        longitude: 81.3533,
        gps_accuracy_m: 10,
        photo_source: 'CAMERA',
        photo_key: 'load_test_key',
      }),
      weight: 5,
    },
  ];

  function getWeightedEndpoint() {
    const rand = Math.random() * 100;
    let accum = 0;
    for (const ep of endpoints) {
      accum += ep.weight;
      if (rand <= accum) return ep;
    }
    return endpoints[0];
  }

  return new Promise((resolve) => {
    function launchNext() {
      if (completed >= totalRequests) {
        if (inFlight === 0) {
          const totalElapsed = (Date.now() - startTime) / 1000;
          const rps = Math.round(successful / totalElapsed);
          const stats = calculatePercentiles(latencies);

          console.log(`Duration:       ${totalElapsed.toFixed(2)}s`);
          console.log(`Requests/sec:   ${rps} req/sec`);
          console.log(`Successful:     ${successful} (${Math.round((successful / totalRequests) * 100)}%)`);
          console.log(`Failed/Timeout: ${failed}`);
          console.log(`Latency p50:    ${stats.p50} ms`);
          console.log(`Latency p95:    ${stats.p95} ms`);
          console.log(`Latency p99:    ${stats.p99} ms`);
          console.log(`Min / Max:      ${stats.min} ms / ${stats.max} ms`);

          resolve({
            stageName,
            concurrency,
            totalRequests,
            durationSec: totalElapsed,
            rps,
            successful,
            failed,
            stats,
          });
        }
        return;
      }

      while (inFlight < concurrency && completed + inFlight < totalRequests) {
        inFlight++;
        const ep = getWeightedEndpoint();
        sendRequest(ep.path, ep.method, ep.body).then((res) => {
          inFlight--;
          completed++;
          latencies.push(res.latency);

          if (res.statusCode >= 200 && res.statusCode < 500) {
            successful++;
          } else {
            failed++;
          }

          launchNext();
        });
      }
    }

    launchNext();
  });
}

async function main() {
  console.log(`Checking connection to ${TARGET_URL}...`);
  const ping = await sendRequest('/health');
  if (ping.statusCode !== 200 && ping.statusCode !== 404) {
    console.error(`Target server not reachable at ${TARGET_URL} (status: ${ping.statusCode}). Make sure the backend server is running.`);
    process.exit(1);
  }
  console.log(`Server responsive (status ${ping.statusCode}, ping ${ping.latency}ms). Starting staged benchmarks.\n`);

  const results = [];
  results.push(await runStage('Stage 1: Smoke / Baseline', 20, 200));
  results.push(await runStage('Stage 2: Moderate Traffic', 100, 1000));
  results.push(await runStage('Stage 3: High Concurrency Burst', 250, 2500));

  console.log('\n======================================================');
  console.log('BENCHMARK SUMMARY REPORT');
  console.log('======================================================');
  console.table(
    results.map((r) => ({
      Stage: r.stageName,
      Concurrency: r.concurrency,
      RPS: r.rps,
      'p50 (ms)': r.stats.p50,
      'p95 (ms)': r.stats.p95,
      'p99 (ms)': r.stats.p99,
      'Success %': `${Math.round((r.successful / r.totalRequests) * 100)}%`,
    }))
  );
}

main().catch(console.error);
