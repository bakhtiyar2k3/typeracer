/**
 * End-to-end smoke test for the timed-race model. Boots an in-memory MongoDB
 * and the real server, then drives:
 *   1) a normal timed race to completion (winner by WPM/correct chars),
 *   2) an aborted race (opponent leaves -> no results recorded),
 *   3) recovery (the freed player re-queues and matches again — never stuck).
 *
 *   npm run smoke
 */
import http from 'node:http';
import assert from 'node:assert';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { io as ioClient } from 'socket.io-client';

const log = (...a) => console.log('  •', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function waitFor(socket, event, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for "${event}"`)), timeout);
    socket.once(event, (payload) => {
      clearTimeout(t);
      resolve(payload);
    });
  });
}

async function main() {
  console.log('Starting in-memory MongoDB…');
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri('typeracer_test');
  process.env.JWT_SECRET = 'smoke-test-secret';
  process.env.PORT = '0';
  process.env.RACE_DURATION_MS = '1200'; // short race for the test

  const { connectDB, disconnectDB } = await import('../config/db.js');
  const { createApp } = await import('../app.js');
  const { initSocket } = await import('../socket/index.js');

  await connectDB();
  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);
  await new Promise((r) => server.listen(0, r));
  const { port } = server.address();
  const base = `http://localhost:${port}`;
  log(`server listening on ${base}`);

  const post = async (path, body, token) => {
    const res = await fetch(base + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`${path} -> ${res.status}: ${JSON.stringify(data)}`);
    return data;
  };
  const get = async (path) => (await fetch(base + path)).json();
  const connect = (token) => ioClient(base, { auth: { token }, transports: ['websocket'] });

  // 1) Auth ------------------------------------------------------------------
  const a = await post('/api/auth/register', {
    username: 'alice',
    email: 'alice@test.dev',
    password: 'password123',
  });
  const b = await post('/api/auth/register', {
    username: 'bob',
    email: 'bob@test.dev',
    password: 'password123',
  });
  log('registered alice & bob');

  const dup = await fetch(base + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'alice', email: 'x@test.dev', password: 'password123' }),
  });
  assert.equal(dup.status, 409, 'duplicate username rejected');
  const health = await get('/api/health');
  assert(health.wordPool >= 300, `word pool >= 300 (got ${health.wordPool})`);
  log(`auth + health OK (${health.wordPool} word pool)`);

  // 2) Normal timed race -----------------------------------------------------
  let sockA = connect(a.token);
  let sockB = connect(b.token);
  await Promise.all([waitFor(sockA, 'connect'), waitFor(sockB, 'connect')]);

  let mfA = waitFor(sockA, 'matchFound');
  let mfB = waitFor(sockB, 'matchFound');
  sockA.emit('joinQueue');
  sockB.emit('joinQueue');
  const [mA, mB] = await Promise.all([mfA, mfB]);
  assert.equal(mA.roomId, mB.roomId, 'same room');
  assert(Array.isArray(mA.words) && mA.words.length > 50, 'words array sent');
  assert.deepEqual(mA.words, mB.words, 'identical word stream for both players');
  assert.equal(mA.duration, 1200, 'duration sent');
  log(`matched: shared stream of ${mA.words.length} words, ${mA.duration}ms`);

  await Promise.all([waitFor(sockA, 'raceStarted'), waitFor(sockB, 'raceStarted')]);

  // Alice receives Bob's caret moving live.
  const bobMoved = waitFor(sockA, 'playerUpdate');
  sockB.emit('typingUpdate', {
    roomId: mB.roomId, userId: b.user.id,
    cursorPosition: 15, correctChars: 15, mistakes: 0, wpm: 50, accuracy: 95,
  });
  const upd = await bobMoved;
  assert.equal(upd.userId, b.user.id, 'alice received bob caret update');
  log('live caret relay OK');

  // Alice types more (will win on correct chars / WPM).
  const raceEnded = waitFor(sockA, 'raceEnded', 6000);
  sockA.emit('typingUpdate', {
    roomId: mA.roomId, userId: a.user.id,
    cursorPosition: 70, correctChars: 70, mistakes: 1, wpm: 95, accuracy: 98,
  });
  const ended = await raceEnded;
  const winner = ended.results.find((r) => r.placement === 1);
  const loser = ended.results.find((r) => r.placement === 2);
  assert.equal(winner.userId, a.user.id, 'alice (more correct chars) placed 1st');
  assert(winner.pointsGained > 0 && loser.pointsGained < 0, 'Elo applied (+winner / -loser)');
  log(`race ended — alice 1st +${winner.pointsGained} (->${winner.newRating}), bob ${loser.pointsGained}`);

  await sleep(300);
  let profile = await get('/api/users/alice');
  assert.equal(profile.user.gamesPlayed, 1, 'alice gamesPlayed=1');
  assert.equal(profile.user.wins, 1, 'alice wins=1');
  assert.equal(profile.recentMatches.length, 1, 'alice has 1 match in history');
  log('persistence OK after normal race');

  // 3) Aborted race (opponent leaves -> no result) ---------------------------
  mfA = waitFor(sockA, 'matchFound');
  mfB = waitFor(sockB, 'matchFound');
  sockA.emit('joinQueue');
  sockB.emit('joinQueue');
  await Promise.all([mfA, mfB]);
  await Promise.all([waitFor(sockA, 'raceStarted'), waitFor(sockB, 'raceStarted')]);

  const left = waitFor(sockA, 'opponentLeft', 4000);
  sockB.disconnect(); // bob "refreshes" / leaves mid-race
  const leftPayload = await left;
  assert.equal(leftPayload.aborted, true, 'alice told the race was aborted');
  log('opponent-left abort OK (alice notified immediately)');

  // Wait beyond the race duration to prove NO result was recorded.
  await sleep(1800);
  profile = await get('/api/users/alice');
  assert.equal(profile.user.gamesPlayed, 1, 'no new match recorded for aborted race');
  log('no results saved for aborted race OK');

  // 4) Recovery — the freed player re-queues and matches again (never stuck) --
  const sockB2 = connect(b.token);
  await waitFor(sockB2, 'connect');
  mfA = waitFor(sockA, 'matchFound', 5000);
  const mfB2 = waitFor(sockB2, 'matchFound', 5000);
  sockA.emit('joinQueue'); // alice was freed by the abort
  sockB2.emit('joinQueue');
  const [rA] = await Promise.all([mfA, mfB2]);
  assert(rA.roomId, 'alice re-matched after opponent left — not stuck waiting');
  log('recovery OK — freed player re-matched');

  // Cleanup
  sockA.close();
  sockB.close();
  sockB2.close();
  await new Promise((r) => server.close(r));
  await disconnectDB();
  await mongo.stop();

  console.log('\n✅ SMOKE TEST PASSED — timed races, live carets, Elo, abort-on-leave & recovery all work.');
  process.exit(0);
}

main().catch(async (err) => {
  console.error('\n❌ SMOKE TEST FAILED:', err);
  process.exit(1);
});
