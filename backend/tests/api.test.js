import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import app from '../src/server.js';
import dbService from '../src/config/dbService.js';

let server;
let baseUrl;
let adminToken;
let judge1Token;
let audienceToken;
let helpDeskToken;

before(async () => {
  // Start server on an ephemeral test port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // Authenticate test users to acquire tokens
  const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@admin.com', password: 'ftsadmin2026' })
  });
  const adminData = await adminRes.json();
  adminToken = adminData.data.token;

  const judgeRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'judge1@event.local', password: 'password123' })
  });
  const judgeData = await judgeRes.json();
  judge1Token = judgeData.data.token;

  const audienceRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'audience@event.local', password: 'password123' })
  });
  const audienceData = await audienceRes.json();
  audienceToken = audienceData.data.token;

  const deskRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'helpdesk@event.local', password: 'password123' })
  });
  const deskData = await deskRes.json();
  helpDeskToken = deskData.data.token;
});

describe('1. Security & Password Encryption Tests', () => {
  test('All seeded user passwords in database must be bcrypt hashed', async () => {
    const users = await dbService.getUsers();
    assert.ok(users.length > 0, 'Users must exist in database');

    for (const user of users) {
      assert.ok(user.passwordHash, `User ${user.email} must have a passwordHash`);
      assert.match(user.passwordHash, /^\$2[aby]\$\d{2}\$/, `Password hash for ${user.email} must be a valid bcrypt hash`);
      const expectedPassword = user.role === 'ADMIN' ? 'ftsadmin2026' : 'password123';
      const matches = await bcrypt.compare(expectedPassword, user.passwordHash);
      assert.strictEqual(matches, true, `Bcrypt compare must succeed for ${user.email}`);
    }
  });

  test('Login succeeds with correct credentials and returns JWT token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@admin.com', password: 'ftsadmin2026' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.token, 'Token should be returned');
    assert.strictEqual(data.data.user.role, 'ADMIN');
    assert.strictEqual(data.data.user.passwordHash, undefined, 'Password hash must NEVER be returned in response');
  });

  test('Login fails with invalid password (401)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@admin.com', password: 'wrongpassword' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.code, 'INVALID_CREDENTIALS');
  });

  test('Security HTTP headers are present in responses', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.strictEqual(res.headers.get('x-xss-protection'), '1; mode=block');
    assert.ok(res.headers.get('content-security-policy'), 'Content-Security-Policy header must be present');
    assert.ok(res.headers.get('permissions-policy'), 'Permissions-Policy header must be present');
  });
});

describe('2. Role-Based Access Control (RBAC) Tests', () => {
  test('Unauthenticated request to protected admin route is rejected (401)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`);
    assert.strictEqual(res.status, 401);
  });

  test('Audience token accessing admin dashboard is forbidden (403)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${audienceToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  test('Judge token accessing admin dashboard is forbidden (403)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${judge1Token}` }
    });
    assert.strictEqual(res.status, 403);
  });

  test('Admin token accessing admin dashboard succeeds (200)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.data.categoriesCount > 0);
  });
});

describe('3. Form Data Persistence: Categories & Participants', () => {
  let createdCategory;
  const uniqueCode = `T${Date.now().toString().slice(-4)}`;

  test('Admin creates a new category via form data -> saved to DB', async () => {
    const res = await fetch(`${baseUrl}/api/admin/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: `Test Category ${uniqueCode}`,
        code: uniqueCode,
        description: 'Automated test competition category'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    createdCategory = data.data.category;
    assert.ok(createdCategory.id);

    // Verify persisted in DB
    const dbCat = await dbService.getCategoryById(createdCategory.id);
    assert.ok(dbCat, 'Category must be persisted in database');
    assert.strictEqual(dbCat.name, `Test Category ${uniqueCode}`);
  });

  test('Help Desk registers a participant via form data -> saved to DB', async () => {
    const partCode = `CH-${uniqueCode}`;
    const regNum = `REG-${uniqueCode}`;

    const res = await fetch(`${baseUrl}/api/participants/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${helpDeskToken}`
      },
      body: JSON.stringify({
        name: 'Aarav Sharma',
        categoryId: createdCategory.id,
        participantCode: partCode,
        registrationNumber: regNum,
        phoneNumber: '9876543210',
        routineTitle: 'Contemporary Fusion Solo'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.participant.participantCode, partCode);

    // Verify persisted in DB
    const dbPart = await dbService.findParticipantByCode(partCode);
    assert.ok(dbPart, 'Participant must be saved to database');
    assert.strictEqual(dbPart.name, 'Aarav Sharma');
  });

  test('Duplicate chest number is rejected (409)', async () => {
    const partCode = `CH-${uniqueCode}`;
    const res = await fetch(`${baseUrl}/api/participants/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${helpDeskToken}`
      },
      body: JSON.stringify({
        name: 'Duplicate Performer',
        categoryId: createdCategory.id,
        participantCode: partCode,
        registrationNumber: `REG-DIFF-${uniqueCode}`,
        phoneNumber: '9876543211',
        routineTitle: 'Another Routine'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(data.code, 'DUPLICATE_CHEST_NUMBER');
  });
});

describe('4. Judge Scoring & One-Time Modification Rule', () => {
  let testParticipant;
  const danceCatId = 'cat_dancing_superstar';

  test('Setup: Open judging and ensure participant exists in assigned category', async () => {
    // Open judging via Admin Event Control
    await fetch(`${baseUrl}/api/admin/event/state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'JUDGING_OPEN' })
    });

    const event = await dbService.getPrimaryEvent();
    assert.strictEqual(event.status, 'JUDGING_OPEN');

    // Register participant in Dancing Superstar
    const pCode = `JTEST-${Date.now().toString().slice(-4)}`;
    const pRes = await fetch(`${baseUrl}/api/participants/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Judge Test Dancer',
        categoryId: danceCatId,
        participantCode: pCode,
        registrationNumber: `R-${pCode}`,
        phoneNumber: '9988776655',
        routineTitle: 'Freestyle Dance'
      })
    });
    const pData = await pRes.json();
    testParticipant = pData.data.participant;
    assert.ok(testParticipant.id);
  });

  test('Judge submits initial score -> saved to DB', async () => {
    const res = await fetch(`${baseUrl}/api/judge/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${judge1Token}`
      },
      body: JSON.stringify({
        participantId: testParticipant.id,
        categoryId: danceCatId,
        score: 88
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.score.score, 88);
    assert.strictEqual(data.data.score.revisionCount, 0);

    // Verify in database
    const dbScore = await dbService.findJudgeScore('usr_judge1', testParticipant.id);
    assert.ok(dbScore);
    assert.strictEqual(dbScore.score, 88);
  });

  test('Judge performs allowed 1st modification -> saved & score history logged', async () => {
    const dbScore = await dbService.findJudgeScore('usr_judge1', testParticipant.id);

    const res = await fetch(`${baseUrl}/api/judge/score/${dbScore.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${judge1Token}`
      },
      body: JSON.stringify({
        score: 92,
        reason: 'Adjusted for exceptional technique'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.data.score.score, 92);
    assert.strictEqual(data.data.score.revisionCount, 1);
    assert.strictEqual(data.data.score.locked, true);

    // Verify score history recorded in database
    const history = await dbService.getScoreHistory(dbScore.id);
    assert.ok(history.length >= 1, 'Score history must be recorded');
    assert.strictEqual(history[0].oldScore, 88);
    assert.strictEqual(history[0].newScore, 92);
  });

  test('Judge attempts 2nd modification -> permanently locked & rejected (403)', async () => {
    const dbScore = await dbService.findJudgeScore('usr_judge1', testParticipant.id);

    const res = await fetch(`${baseUrl}/api/judge/score/${dbScore.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${judge1Token}`
      },
      body: JSON.stringify({
        score: 95,
        reason: 'Attempting second edit'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.code, 'SCORE_EDIT_LIMIT_REACHED');
  });
});

describe('5. Audience Voting & Duplicate Prevention', () => {
  let voteParticipant;
  const singingCatId = 'cat_singing_idol';

  test('Setup: Open voting and register a contestant', async () => {
    await fetch(`${baseUrl}/api/admin/event/state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'VOTING_OPEN' })
    });

    const vCode = `VOTE-${Date.now().toString().slice(-4)}`;
    const pRes = await fetch(`${baseUrl}/api/participants/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Vocal Sensation',
        categoryId: singingCatId,
        participantCode: vCode,
        registrationNumber: `R-${vCode}`,
        phoneNumber: '9112233445',
        routineTitle: 'Acoustic Cover'
      })
    });
    const pData = await pRes.json();
    voteParticipant = pData.data.participant;
  });

  test('Audience submits vote for participant 1 -> saved to database', async () => {
    const res = await fetch(`${baseUrl}/api/audience/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${audienceToken}`
      },
      body: JSON.stringify({
        participantId: voteParticipant.id,
        categoryId: singingCatId
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);

    // Verify in database
    const dbVote = await dbService.findAudienceVote('usr_audience', voteParticipant.id);
    assert.ok(dbVote);
    assert.strictEqual(dbVote.participantId, voteParticipant.id);
  });

  test('Audience attempts duplicate vote for participant 1 -> rejected (409)', async () => {
    const res = await fetch(`${baseUrl}/api/audience/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${audienceToken}`
      },
      body: JSON.stringify({
        participantId: voteParticipant.id,
        categoryId: singingCatId
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(data.code, 'ALREADY_VOTED');
    assert.strictEqual(data.message, 'You have already voted for this participant. Each person is allowed to vote only once per participant.');
  });

  test('Per-Participant Rule: Same user CAN vote for Participant 2 in the SAME category', async () => {
    // Register Participant 2 in the same category (singingCatId)
    const p2Res = await fetch(`${baseUrl}/api/participants/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Second Vocalist',
        categoryId: singingCatId,
        participantCode: `SNG-P2-${Date.now().toString().slice(-4)}`,
        registrationNumber: `R-SNG-P2-${Date.now().toString().slice(-4)}`,
        phoneNumber: '9112233446',
        routineTitle: 'Jazz Standards'
      })
    });
    const p2Data = await p2Res.json();
    assert.ok(p2Data.data?.participant, 'Participant 2 must be registered');
    const voteParticipant2 = p2Data.data.participant;

    // Same user votes for Participant 2 -> Success (201)
    const res = await fetch(`${baseUrl}/api/audience/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${audienceToken}`
      },
      body: JSON.stringify({
        participantId: voteParticipant2.id,
        categoryId: singingCatId
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);

    // User attempts duplicate vote for Participant 2 -> Rejected (409)
    const dupRes = await fetch(`${baseUrl}/api/audience/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${audienceToken}`
      },
      body: JSON.stringify({
        participantId: voteParticipant2.id,
        categoryId: singingCatId
      })
    });
    const dupData = await dupRes.json();
    assert.strictEqual(dupRes.status, 409);
    assert.strictEqual(dupData.code, 'ALREADY_VOTED');
    assert.strictEqual(dupData.message, 'You have already voted for this participant. Each person is allowed to vote only once per participant.');
  });

  test('IP-Based Restriction: Different user account from SAME IP attempting to vote for participant 1 -> rejected (409)', async () => {
    // 1. Authenticate a second audience account
    const regRes = await fetch(`${baseUrl}/api/auth/audience-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regNo: '12440099',
        phone: '9876543299',
        email: 'student2@gmail.com'
      })
    });
    const regData = await regRes.json();
    assert.strictEqual(regRes.status, 200);
    const audienceToken2 = regData.data.token;

    // 2. Attempt to vote from the SAME public IP (default 127.0.0.1) for participant 1
    const res = await fetch(`${baseUrl}/api/audience/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${audienceToken2}`
      },
      body: JSON.stringify({
        participantId: voteParticipant.id,
        categoryId: singingCatId
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(data.code, 'ALREADY_VOTED');
    assert.strictEqual(data.message, 'You have already voted for this participant. Each person is allowed to vote only once per participant.');
  });

  test('Device-Based Restriction: Different account and IP, but SAME device fingerprint -> rejected (409)', async () => {
    const uniqueDevSuffix = Date.now().toString().slice(-4);
    const regRes = await fetch(`${baseUrl}/api/auth/audience-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regNo: `1244${uniqueDevSuffix}`,
        phone: `987654${uniqueDevSuffix}`,
        email: `student3_${uniqueDevSuffix}@gmail.com`
      })
    });
    const regData = await regRes.json();
    const audienceToken3 = regData.data.token;

    const testCatId = 'cat_open_mic';
    const pDevRes = await fetch(`${baseUrl}/api/participants/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: `Dev Test Participant ${uniqueDevSuffix}`,
        categoryId: testCatId,
        participantCode: `MIC-${uniqueDevSuffix}`,
        registrationNumber: `R-MIC-${uniqueDevSuffix}`,
        phoneNumber: `911223${uniqueDevSuffix}`,
        routineTitle: 'Device Restriction Routine'
      })
    });
    const pDevData = await pDevRes.json();
    assert.ok(pDevData.data?.participant, 'Device test participant must be registered');
    const testPart = pDevData.data.participant;

    const deviceSignature = `device_fp_unique_hash_${Date.now()}`;

    // First vote with this device signature from IP A for testPart
    const res1 = await fetch(`${baseUrl}/api/audience/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${audienceToken3}`,
        'x-forwarded-for': '198.51.100.10',
        'x-device-id': deviceSignature
      },
      body: JSON.stringify({
        participantId: testPart.id,
        categoryId: testCatId
      })
    });
    assert.strictEqual(res1.status, 201);

    // Another account from IP B attempts to vote for the SAME participant with the SAME device signature
    const uniqueDevSuffix2 = (Date.now() + 7).toString().slice(-4);
    const regRes4 = await fetch(`${baseUrl}/api/auth/audience-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regNo: `1245${uniqueDevSuffix2}`,
        phone: `987655${uniqueDevSuffix2}`,
        email: `student4_${uniqueDevSuffix2}@gmail.com`
      })
    });
    const regData4 = await regRes4.json();
    const audienceToken4 = regData4.data.token;

    const res2 = await fetch(`${baseUrl}/api/audience/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${audienceToken4}`,
        'x-forwarded-for': '198.51.100.20', // Different IP!
        'x-device-id': deviceSignature     // Same device!
      },
      body: JSON.stringify({
        participantId: testPart.id,
        categoryId: testCatId
      })
    });
    const data2 = await res2.json();
    assert.strictEqual(res2.status, 409);
    assert.strictEqual(data2.code, 'ALREADY_VOTED');
    assert.strictEqual(data2.message, 'You have already voted for this participant. Each person is allowed to vote only once per participant.');
  });

  test('Race Condition Prevention: Concurrent simultaneous requests for same participant record exactly one vote', async () => {
    const regRes = await fetch(`${baseUrl}/api/auth/audience-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regNo: '12440066',
        phone: '9876543266',
        email: 'student5@gmail.com'
      })
    });
    const regData = await regRes.json();
    const token = regData.data.token;

    const elocutionCatId = 'cat_elocution';
    const pRes = await fetch(`${baseUrl}/api/participants/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Speed Speaker',
        categoryId: elocutionCatId,
        participantCode: `ELO-RACE-${Date.now().toString().slice(-4)}`,
        registrationNumber: `R-ELO-RACE-${Date.now().toString().slice(-4)}`,
        phoneNumber: '9112233999',
        routineTitle: 'The Future of AI'
      })
    });
    const pData = await pRes.json();
    assert.ok(pData.data?.participant, 'Race participant must be registered');
    const racePart = pData.data.participant;

    // Fire 2 simultaneous requests for the same participant
    const [req1, req2] = await Promise.all([
      fetch(`${baseUrl}/api/audience/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-forwarded-for': '198.51.100.99'
        },
        body: JSON.stringify({
          participantId: racePart.id,
          categoryId: elocutionCatId
        })
      }),
      fetch(`${baseUrl}/api/audience/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-forwarded-for': '198.51.100.99'
        },
        body: JSON.stringify({
          participantId: racePart.id,
          categoryId: elocutionCatId
        })
      })
    ]);

    const statuses = [req1.status, req2.status].sort();
    assert.deepStrictEqual(statuses, [201, 409], 'Exactly one request must succeed (201) and one must be rejected (409)');
  });
});

describe('6. 85/15 Mathematical Scoring & Results Calculation', () => {
  test('Unpublished results reject unauthenticated users with 403', async () => {
    const res = await fetch(`${baseUrl}/api/results`);
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.code, 'RESULTS_UNPUBLISHED');
  });

  test('Admin accesses unpublished results and accurately computes Final Score = (Judge Score * 0.85) + (Audience Score * 0.15)', async () => {
    const res = await fetch(`${baseUrl}/api/results`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.results);

    // Find our singing idol category results
    const singingResults = data.data.results['cat_singing_idol'];
    if (singingResults && singingResults.length > 0) {
      for (const r of singingResults) {
        const expected = Number(((r.judgeScore * 0.85) + (r.audienceScore * 0.15)).toFixed(2));
        assert.strictEqual(r.finalScore, expected, `Result for ${r.participantName} must follow 85/15 formula`);
      }
    }
  });

  test('Admin locks results -> event status transitions to RESULTS_LOCKED', async () => {
    const res = await fetch(`${baseUrl}/api/results/lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.data.event.resultsLocked, true);
  });
});

describe('7. Audit Logging & System Traceability', () => {
  test('Audit log records are generated for sensitive events with IP and timestamp', async () => {
    const res = await fetch(`${baseUrl}/api/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.data.auditLogs.length > 0, 'Audit logs must be populated');

    const sample = data.data.auditLogs[0];
    assert.ok(sample.action, 'Action must be recorded');
    assert.ok(sample.entityType, 'Entity type must be recorded');
    assert.ok(sample.createdAt, 'Timestamp must be recorded');
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  process.exit(0);
});

