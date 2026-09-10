import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5001';

async function runSecurityTests() {
  const results = [];

  function record(testName, expected, actual, pass) {
    results.push({ testName, expected, actual, pass });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${testName}`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual:   ${actual}`);
  }

  // 1. Authenticate test users to acquire valid tokens before any rate limiting tests
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@admin.com', password: 'ftsadmin2026' })
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.data?.token;

  const judge1LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'judge1@event.local', password: 'password123' })
  });
  const judge1LoginData = await judge1LoginRes.json();
  const judge1Token = judge1LoginData.data?.token;

  const judge2LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'judge2@event.local', password: 'password123' })
  });
  const judge2LoginData = await judge2LoginRes.json();
  const judge2Token = judge2LoginData.data?.token;

  const audienceLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'audience@event.local', password: 'password123' })
  });
  const audienceLoginData = await audienceLoginRes.json();
  const audienceToken = audienceLoginData.data?.token;

  console.log('--- STARTING COMPREHENSIVE SECURITY REGRESSION TESTS ---\n');

  // TEST 1: Forged JWT using the old hardcoded fallback secret ('fts_super_secret_jwt_key_2026')
  try {
    const forgedToken = jwt.sign(
      { userId: 'usr_admin', role: 'ADMIN', name: 'Forged Admin' },
      'fts_super_secret_jwt_key_2026',
      { expiresIn: '1h' }
    );
    const res = await fetch(`${BASE_URL}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${forgedToken}` }
    });
    record('TEST 1: Forged JWT using OLD fallback secret', 'HTTP 401', `HTTP ${res.status}`, res.status === 401);
  } catch (err) {
    record('TEST 1: Forged JWT using OLD fallback secret', 'HTTP 401', err.message, false);
  }

  // TEST 2: Anonymous POST /api/live/action
  try {
    const res = await fetch(`${BASE_URL}/api/live/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'CLEAR_ALL_DATA', payload: {} })
    });
    record('TEST 2: Anonymous POST /api/live/action', 'HTTP 401', `HTTP ${res.status}`, res.status === 401);
  } catch (err) {
    record('TEST 2: Anonymous POST /api/live/action', 'HTTP 401', err.message, false);
  }

  // TEST 3: Non-admin POST /api/live/action (Judge and Audience)
  try {
    const resJudge = await fetch(`${BASE_URL}/api/live/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${judge1Token}`
      },
      body: JSON.stringify({ action: 'SET_WEIGHTS', payload: { judge: 50 } })
    });
    const resAudience = await fetch(`${BASE_URL}/api/live/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${audienceToken}`
      },
      body: JSON.stringify({ action: 'SET_WEIGHTS', payload: { judge: 50 } })
    });
    const pass = (resJudge.status === 403 && resAudience.status === 403);
    record('TEST 3: Non-admin POST /api/live/action', 'HTTP 403 for both Judge and Audience', `Judge: ${resJudge.status}, Audience: ${resAudience.status}`, pass);
  } catch (err) {
    record('TEST 3: Non-admin POST /api/live/action', 'HTTP 403', err.message, false);
  }

  // TEST 4: Anonymous PATCH /api/events/controls
  try {
    const res = await fetch(`${BASE_URL}/api/events/controls`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ votingOpen: true })
    });
    record('TEST 4: Anonymous PATCH /api/events/controls', 'HTTP 401', `HTTP ${res.status}`, res.status === 401);
  } catch (err) {
    record('TEST 4: Anonymous PATCH /api/events/controls', 'HTTP 401', err.message, false);
  }

  // TEST 5: Audience OTP login with Missing OTP
  try {
    const res = await fetch(`${BASE_URL}/api/auth/audience-otp-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regNo: '2026TEST001', email: 'test_student@event.local' })
    });
    record('TEST 5: Audience OTP login with Missing OTP', 'HTTP 401', `HTTP ${res.status}`, res.status === 401);
  } catch (err) {
    record('TEST 5: Audience OTP login with Missing OTP', 'HTTP 401', err.message, false);
  }

  // TEST 6: Audience OTP login with Invalid OTP
  try {
    const res = await fetch(`${BASE_URL}/api/auth/audience-otp-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regNo: '2026TEST002', email: 'test_student2@event.local', otp: '000000' })
    });
    record('TEST 6: Audience OTP login with Invalid OTP', 'HTTP 401', `HTTP ${res.status}`, res.status === 401);
  } catch (err) {
    record('TEST 6: Audience OTP login with Invalid OTP', 'HTTP 401', err.message, false);
  }

  // TEST 7: Correct Test OTP login (send-otp then verify)
  try {
    const email = 'valid_audience@event.local';
    const regNo = '2026AUD099';
    await fetch(`${BASE_URL}/api/live/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, regNo, phone: '9876543210' })
    });
    const res = await fetch(`${BASE_URL}/api/auth/audience-otp-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, regNo, otp: '123456' })
    });
    const data = await res.json();
    const pass = (res.status === 200 && data.success === true && Boolean(data.data?.token));
    record('TEST 7: Correct Test OTP login flow', 'HTTP 200 with JWT', `HTTP ${res.status}, success: ${data.success}`, pass);
  } catch (err) {
    record('TEST 7: Correct Test OTP login flow', 'HTTP 200', err.message, false);
  }

  // TEST 8: Unpublished GET /api/results (unauthorized 403, Admin 200)
  try {
    const resAnon = await fetch(`${BASE_URL}/api/results`);
    const resJudge = await fetch(`${BASE_URL}/api/results`, {
      headers: { Authorization: `Bearer ${judge1Token}` }
    });
    const resAdmin = await fetch(`${BASE_URL}/api/results`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const pass = (resAnon.status === 403 && resJudge.status === 403 && resAdmin.status === 200);
    record('TEST 8: Unpublished GET /api/results access control', 'Anon 403, Judge 403, Admin 200', `Anon: ${resAnon.status}, Judge: ${resJudge.status}, Admin: ${resAdmin.status}`, pass);
  } catch (err) {
    record('TEST 8: Unpublished GET /api/results access control', 'Anon 403, Admin 200', err.message, false);
  }

  // TEST 9: Public GET /api/live/state (Check for no PIN, no judge access codes, no private credentials)
  try {
    const res = await fetch(`${BASE_URL}/api/live/state`);
    const data = await res.json();
    const state = data.state || {};
    const hasPin = Boolean(state.event?.pin);
    const hasJudgeCodes = (state.judges || []).some(j => Boolean(j.code || j.accessCode || j.email));
    const pass = (res.status === 200 && !hasPin && !hasJudgeCodes);
    record('TEST 9: Public GET /api/live/state credential scrubbing', 'No event.pin, no judge code/accessCode/email', `event.pin: ${state.event?.pin || 'ABSENT'}, judge codes: ${hasJudgeCodes ? 'LEAKED' : 'CLEAN'}`, pass);
  } catch (err) {
    record('TEST 9: Public GET /api/live/state credential scrubbing', 'Clean state', err.message, false);
  }

  // TEST 10: Public SSE GET /api/live/stream INIT_STATE credential scrubbing
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${BASE_URL}/api/live/stream`, { signal: controller.signal });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let initialChunk = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      initialChunk += decoder.decode(value, { stream: true });
      if (initialChunk.includes('INIT_STATE')) break;
    }
    clearTimeout(timeout);
    reader.cancel();

    const containsPin = initialChunk.includes('"pin":"4821"');
    const containsJudgeCode = initialChunk.includes('"code":"4821"') || initialChunk.includes('"accessCode":"4821"');
    const pass = (!containsPin && !containsJudgeCode && initialChunk.includes('INIT_STATE'));
    record('TEST 10: Public SSE /api/live/stream INIT_STATE scrubbing', 'No PIN, no judge code in SSE payload', `containsPin: ${containsPin}, containsJudgeCode: ${containsJudgeCode}`, pass);
  } catch (err) {
    record('TEST 10: Public SSE /api/live/stream INIT_STATE scrubbing', 'Clean SSE stream', err.message, false);
  }

  // TEST 11: CSV Formula Injection Neutralization
  try {
    const { sanitizeCsvCell } = await import('../src/controllers/resultController.js');
    const formulaTests = ['=1+1', '+123', '-123', '@SUM(1+1)', '\tcmd', '\rcmd', 'Safe Text'];
    let allNeutralized = true;
    for (const item of formulaTests.slice(0, 6)) {
      const sanitized = sanitizeCsvCell(item);
      if (!sanitized.startsWith("\"'")) {
        allNeutralized = false;
      }
    }
    const safeSanitized = sanitizeCsvCell('Safe Text');
    if (safeSanitized !== '"Safe Text"') allNeutralized = false;
    record('TEST 11: CSV Formula Injection Neutralization', 'Neutralizes =, +, -, @, \\t, \\r with single quote', `All 6 dangerous payloads sanitized: ${allNeutralized}`, allNeutralized);
  } catch (err) {
    record('TEST 11: CSV Formula Injection Neutralization', 'Sanitized', err.message, false);
  }

  // TEST 12: CORS Origin Allowlist (Attacker Origin Rejection)
  try {
    const res = await fetch(`${BASE_URL}/api/health`, {
      headers: { Origin: 'https://attacker.example' }
    });
    const acao = res.headers.get('access-control-allow-origin');
    const pass = (acao !== 'https://attacker.example' && acao !== '*');
    record('TEST 12: CORS Attacker Origin Rejection', 'Origin https://attacker.example rejected/not reflected', `ACAO header: ${acao || 'None (correct)'}`, pass);
  } catch (err) {
    record('TEST 12: CORS Attacker Origin Rejection', 'Origin rejected', err.message, false);
  }

  // TEST 13: Judge Score History IDOR Protection (Judge A cannot access Judge B score history)
  try {
    // Ensure judging is open
    await fetch(`${BASE_URL}/api/admin/event/state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'JUDGING_OPEN' })
    });

    // 1. Submit a score as Judge 1
    const submitRes = await fetch(`${BASE_URL}/api/judge/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${judge1Token}`
      },
      body: JSON.stringify({
        participantId: 'p1',
        categoryId: 'cat_dancing_superstar',
        score: 88
      })
    });
    const submitData = await submitRes.json();
    const scoreId = submitData.data?.score?.id;

    if (scoreId) {
      // Judge 1 accesses own score history -> 200
      const resOwn = await fetch(`${BASE_URL}/api/judge/scores/${scoreId}/history`, {
        headers: { Authorization: `Bearer ${judge1Token}` }
      });

      // Judge 2 accesses Judge 1's score history -> 403
      const resOther = await fetch(`${BASE_URL}/api/judge/scores/${scoreId}/history`, {
        headers: { Authorization: `Bearer ${judge2Token}` }
      });

      const pass = (resOwn.status === 200 && resOther.status === 403);
      record('TEST 13: Judge Score History IDOR Protection', 'Judge 1 own: 200, Judge 2 accessing Judge 1: 403', `Judge 1: ${resOwn.status}, Judge 2: ${resOther.status}`, pass);
    } else {
      record('TEST 13: Judge Score History IDOR Protection', 'HTTP 403 on cross-judge access', `Score submission failed: ${submitRes.status}`, false);
    }
  } catch (err) {
    record('TEST 13: Judge Score History IDOR Protection', 'HTTP 403', err.message, false);
  }

  // TEST 14: Security Headers Verification (CSP & Permissions-Policy)
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const csp = res.headers.get('content-security-policy');
    const pp = res.headers.get('permissions-policy');
    const xcto = res.headers.get('x-content-type-options');
    const xfo = res.headers.get('x-frame-options');

    const pass = Boolean(csp && pp && xcto === 'nosniff' && xfo === 'SAMEORIGIN');
    record('TEST 14: Security Headers (CSP & Permissions-Policy)', 'CSP and Permissions-Policy present with standard headers', `CSP: ${csp ? 'PRESENT' : 'MISSING'}, PP: ${pp ? 'PRESENT' : 'MISSING'}`, pass);
  } catch (err) {
    record('TEST 14: Security Headers', 'Headers present', err.message, false);
  }

  // TEST 15: Judge Code Rate Limiting (Executed last so rate-limit throttling doesn't affect earlier steps)
  try {
    let triggered429 = false;
    for (let i = 0; i < 35; i++) {
      const res = await fetch(`${BASE_URL}/api/auth/judge-code-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: `BRUTE_${i}` })
      });
      if (res.status === 429) {
        triggered429 = true;
        break;
      }
    }
    record('TEST 15: Judge Code Login Rate Limiting', 'HTTP 429 Too Many Requests upon rapid brute-force', `HTTP 429 triggered: ${triggered429}`, triggered429);
  } catch (err) {
    record('TEST 15: Judge Code Login Rate Limiting', 'HTTP 429', err.message, false);
  }

  console.log('\n--- SECURITY REGRESSION SUMMARY ---');
  const passedCount = results.filter(r => r.pass).length;
  console.log(`Passed: ${passedCount} / ${results.length}`);
  if (passedCount === results.length) {
    console.log('ALL SECURITY REGRESSION TESTS PASSED SUCCESSFULLY!');
  } else {
    console.log('SOME TESTS FAILED! Check log above.');
  }

  return results;
}

runSecurityTests().catch(console.error);
