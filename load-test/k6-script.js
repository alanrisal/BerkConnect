import http from 'k6/http';
import { check, sleep } from 'k6';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Set this to your Vercel preview URL for the load-testing branch.
// Find it in: Vercel Dashboard → your project → Deployments → load-testing branch
const BASE_URL = __ENV.BASE_URL || 'https://your-load-testing-branch.vercel.app';

// Demo user ID — matches DEMO_USER.id in lib/demo-mode.ts
const DEMO_USER_ID = 'demo-user-123';

// ─── TEST SCENARIOS ───────────────────────────────────────────────────────────
// Run with:  k6 run load-test/k6-script.js
//
// Smoke test (5 users, 1 min) — run this FIRST to verify things work:
//   k6 run --vus 5 --duration 1m load-test/k6-script.js
//
// Peak test (ramp to 600):
//   k6 run load-test/k6-script.js
//
// Sustained test (600 users, 30 min):
//   k6 run --vus 600 --duration 30m load-test/k6-script.js
//
// Pass a custom URL without editing this file:
//   k6 run -e BASE_URL=https://my-branch.vercel.app load-test/k6-script.js

export const options = {
  scenarios: {
    peak_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },  // warm up
        { duration: '3m', target: 300 },  // ramp
        { duration: '5m', target: 600 },  // peak
        { duration: '2m', target: 0   },  // cool down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // 95% of requests under 3s
    http_req_failed:   ['rate<0.05'],   // less than 5% errors
  },
};

// ─── SETUP ────────────────────────────────────────────────────────────────────
// Runs once before all VUs start. Fetches real club IDs from the API so
// the test uses real UUIDs rather than hardcoded / fake IDs that 404.
export function setup() {
  const res = http.get(`${BASE_URL}/api/clubs?limit=20`);
  if (res.status !== 200) {
    console.error(`Setup failed — could not fetch clubs (${res.status}): ${res.body}`);
    return { clubIds: [] };
  }
  const body = JSON.parse(res.body);
  const clubIds = (body.data || []).map((c) => c.id).filter(Boolean);
  console.log(`Setup: loaded ${clubIds.length} club IDs`);
  return { clubIds };
}

// ─── VIRTUAL USER SCENARIO ───────────────────────────────────────────────────
// Each VU runs this function in a loop. Simulates a realistic browsing session:
// land on feed → browse clubs → open a club → check notifications.
export default function (data) {
  const headers = { 'Content-Type': 'application/json' };

  const clubIds = data.clubIds || [];
  const clubId  = clubIds.length > 0
    ? clubIds[Math.floor(Math.random() * clubIds.length)]
    : null;

  // 1. Load the feed (every user does this first)
  let res = http.get(`${BASE_URL}/api/feed?page=1&limit=20&userId=${DEMO_USER_ID}`, { headers });
  check(res, {
    'feed → 200':       (r) => r.status === 200,
    'feed → has data':  (r) => { try { return JSON.parse(r.body).data !== undefined } catch { return false } },
  });
  sleep(randomBetween(1, 2));

  // 2. Load the club list
  res = http.get(`${BASE_URL}/api/clubs?userId=${DEMO_USER_ID}`, { headers });
  check(res, { 'clubs list → 200': (r) => r.status === 200 });
  sleep(randomBetween(0.5, 1.5));

  // 3. Open a specific club (the heaviest route — 7 parallel DB queries)
  if (clubId) {
    res = http.get(`${BASE_URL}/api/clubs/${clubId}/details?userId=${DEMO_USER_ID}`, { headers });
    check(res, { 'club detail → 200': (r) => r.status === 200 });
    sleep(randomBetween(1, 3));
  }

  // 4. Check notifications
  res = http.get(`${BASE_URL}/api/notifications?userId=${DEMO_USER_ID}&limit=20`, { headers });
  check(res, { 'notifications → 200': (r) => r.status === 200 });
  sleep(randomBetween(0.5, 1));

  // 5. User stats (profile page)
  res = http.get(`${BASE_URL}/api/users/stats?userId=${DEMO_USER_ID}`, { headers });
  check(res, { 'user stats → 200': (r) => r.status === 200 });
  sleep(randomBetween(2, 4));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}
