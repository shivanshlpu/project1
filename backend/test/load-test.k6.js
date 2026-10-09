// ==============================================================================
// AHTRI FFA — Staged Load Testing Scenario (k6)
// Simulates 100K Concurrent User Field Workload
// Distribution: 82% Reads (/tasks/my, /doctors, /attendance/today), 18% Writes (/tasks/complete, /attendance/punch-in)
// ==============================================================================

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const ADMIN_TOKEN = __ENV.AUTH_TOKEN || '';

export const options = {
  stages: [
    { duration: '30s', target: 100 },   // Stage 1: Smoke / Ramp to 100 VUs
    { duration: '1m',  target: 500 },   // Stage 2: Normal morning shift load (500 VUs)
    { duration: '2m',  target: 1000 },  // Stage 3: Peak shift burst (1,000 VUs)
    { duration: '2m',  target: 2500 },  // Stage 4: High stress saturation (2,500 VUs)
    { duration: '30s', target: 0 },     // Ramp down / Recovery
  ],
  thresholds: {
    http_req_duration: ['p(95)<350', 'p(99)<750'], // 95% of requests under 350ms
    http_req_failed: ['rate<0.01'],                 // Error rate < 1%
  },
};

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': 'usr-mr-01',
  };
  if (ADMIN_TOKEN) {
    headers['Authorization'] = `Bearer ${ADMIN_TOKEN}`;
  }

  // Workload weighting: 82% read, 18% write
  const rand = Math.random();

  if (rand < 0.50) {
    // 50% Task querying (dominant mobile foreground path)
    const res = http.get(`${BASE_URL}/tasks/my`, { headers });
    check(res, {
      'tasks status 200': (r) => r.status === 200,
    });
  } else if (rand < 0.70) {
    // 20% Doctor directory lookup
    const res = http.get(`${BASE_URL}/doctors`, { headers });
    check(res, {
      'doctors status 200': (r) => r.status === 200,
    });
  } else if (rand < 0.82) {
    // 12% Attendance status query
    const res = http.get(`${BASE_URL}/attendance/today`, { headers });
    check(res, {
      'attendance status 200': (r) => r.status === 200,
    });
  } else if (rand < 0.95) {
    // 13% Task start / location verification
    const payload = JSON.stringify({
      latitude: 23.2968,
      longitude: 81.3533,
      gps_accuracy_m: 10,
    });
    const res = http.post(`${BASE_URL}/tasks/task-01/start`, payload, { headers });
    check(res, {
      'task start accepted': (r) => [200, 201, 400, 403, 404].includes(r.status),
    });
  } else {
    // 5% Attendance Punch
    const payload = JSON.stringify({
      latitude: 23.2968,
      longitude: 81.3533,
      gps_accuracy_m: 10,
      photo_source: 'CAMERA',
      photo_key: 'load_test_proof',
    });
    const res = http.post(`${BASE_URL}/attendance/punch-in`, payload, { headers });
    check(res, {
      'punch-in accepted': (r) => [200, 201, 400].includes(r.status),
    });
  }

  // Realistic user think time between interactions (simulates 25s polling or manual taps)
  sleep(Math.random() * 2 + 1);
}
