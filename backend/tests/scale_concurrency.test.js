import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/server.js';
import dbService from '../src/config/dbService.js';
import { liveEventService } from '../src/services/liveEventService.js';

let server;
let baseUrl;
let audienceToken;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // Ensure event status is VOTING_OPEN
  await dbService.updateEventState('VOTING_OPEN');

  // Authenticate audience user for testing protected endpoints
  const authRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'audience@event.local', password: 'password123' })
  });
  const authData = await authRes.json();
  audienceToken = authData.data.token;
});

describe('1. 4,000 Voters High Concurrency & O(1) Indexing', () => {
  test('High-speed parallel voting across 4,000 distinct voters', async () => {
    const participant = await dbService.createParticipant({
      categoryId: 'cat_dancing_superstar',
      code: 'SCALE-01',
      participantCode: 'SCALE-01',
      registrationNumber: 'SCALE-REG-01',
      name: 'Scale Runner',
      status: 'ACTIVE'
    });

    const startTime = Date.now();
    const TOTAL_USERS = 4000;
    const CHUNK_SIZE = 250;

    let successfulVotes = 0;

    for (let i = 0; i < TOTAL_USERS; i += CHUNK_SIZE) {
      const batch = [];
      const limit = Math.min(i + CHUNK_SIZE, TOTAL_USERS);

      for (let j = i; j < limit; j++) {
        const userId = `scale_user_${j}`;
        const deviceId = `dev_fingerprint_${j}`;
        const phone = `98765${String(j).padStart(5, '0')}`;
        const regNo = `122${String(j).padStart(5, '0')}`;

        batch.push(
          dbService.createAudienceVote({
            audienceId: userId,
            participantId: participant.id,
            categoryId: 'cat_dancing_superstar',
            ipAddress: `10.0.${Math.floor(j / 250)}.${j % 250}`,
            deviceFingerprint: deviceId,
            phone,
            regNo
          })
        );
      }

      const results = await Promise.all(batch);
      successfulVotes += results.length;
    }

    const elapsedMs = Date.now() - startTime;
    assert.equal(successfulVotes, TOTAL_USERS, 'All 4,000 votes must be successfully saved');
    assert.ok(elapsedMs < 5000, `4,000 votes processed in ${elapsedMs}ms (< 5000ms target)`);

    // Verify O(1) duplicate detection performance under full 4,000 vote volume
    const dupCheckStart = Date.now();
    const existing = await dbService.findAudienceVoteByCriteria({
      audienceId: 'scale_user_2500',
      participantId: participant.id
    });
    const dupCheckElapsed = Date.now() - dupCheckStart;

    assert.ok(existing, 'Should immediately find indexed vote');
    assert.ok(dupCheckElapsed < 10, `O(1) lookup took ${dupCheckElapsed}ms (< 10ms)`);
  });
});

describe('2. Campus Wi-Fi NAT Rate Limiting', () => {
  test('Rate limiting allows multiple distinct users on shared campus Wi-Fi NAT IP', async () => {
    const sharedIp = '192.168.100.5';
    const promises = [];

    for (let i = 0; i < 50; i++) {
      promises.push(
        fetch(`${baseUrl}/api/audience/categories`, {
          headers: {
            'Authorization': `Bearer ${audienceToken}`,
            'x-forwarded-for': sharedIp,
            'x-device-id': `wifi_user_device_${i}`
          }
        })
      );
    }

    const responses = await Promise.all(promises);
    const successCount = responses.filter(r => r.status === 200).length;

    assert.equal(successCount, 50, 'All 50 distinct devices sharing the same NAT IP should succeed');
  });
});

describe('3. Real-Time SSE High-Capacity Broadcast', () => {
  test('Live SSE broadcast handles 1,000 simulated client connections', async () => {
    const mockClients = [];
    let writesCount = 0;

    for (let i = 0; i < 1000; i++) {
      mockClients.push({
        writable: true,
        destroyed: false,
        writableEnded: false,
        write: () => {
          writesCount++;
          return true;
        },
        on: () => {}
      });
    }

    // Register 1,000 clients
    mockClients.forEach(c => liveEventService.addClient(c));

    const broadcastStart = Date.now();
    liveEventService.broadcast('TEST_PING', { score: 99 });
    const broadcastElapsed = Date.now() - broadcastStart;

    assert.ok(broadcastElapsed < 150, `Broadcast dispatch initiated in ${broadcastElapsed}ms`);
    assert.ok(writesCount >= 1000, 'All connected mock clients received initial and broadcast data');

    // Wait for micro-tick chunking to drain
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Clean up mock clients
    mockClients.forEach(c => liveEventService.sseClients.delete(c));
  });
});

describe('4. Response Compression', () => {
  test('Compression middleware responds with Vary: Accept-Encoding', async () => {
    const res = await fetch(`${baseUrl}/api/audience/categories`, {
      headers: {
        'Authorization': `Bearer ${audienceToken}`,
        'Accept-Encoding': 'gzip, deflate',
        'x-device-id': 'compression_tester_device'
      }
    });

    assert.equal(res.status, 200);
    const varyHeader = res.headers.get('vary');
    assert.ok(varyHeader && varyHeader.includes('Accept-Encoding'), 'Vary header includes Accept-Encoding');
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});
