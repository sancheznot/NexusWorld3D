import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Deliberately ignores project DB settings and never loads dotenv.
if (process.env.NEXUS_RUN_ISOLATED_DB_TESTS !== '1') {
  throw new Error('Start compose.validation.yml and set NEXUS_RUN_ISOLATED_DB_TESTS=1');
}
process.env.DATABASE_URL = 'mysql://nexus_validation:nexus-validation-only@127.0.0.1:13307/nexus_validation';
delete process.env.NEXUS_SKIP_AUTO_MIGRATE;
for (const key of Object.keys(process.env)) {
  if (/^(REDIS_|UPSTASH_|KV_)/.test(key)) delete process.env[key];
}

test('isolated MariaDB: migrations, account profiles and single-use login tokens', async () => {
  const sceneDirectory = mkdtempSync(join(tmpdir(), 'nexus-account-spawn-'));
  const previousSceneDir = process.env.NEXUS_SCENE_PERSIST_DIR;
  const previousSceneLoad = process.env.NEXUS_SCENE_LOAD_PERSISTED;
  process.env.NEXUS_SCENE_PERSIST_DIR = sceneDirectory;
  process.env.NEXUS_SCENE_LOAD_PERSISTED = '1';
  const { runPendingMigrations } = await import('../src/lib/db/runMigrations');
  const { mariaAuthAdapter } = await import('../src/lib/auth/mariaAuthAdapter');
  const { identityStorageKey } = await import('../src/lib/auth/worldIdentity');
  const { upsertPlayerProfile, fetchPlayerProfileByIdentity } = await import('../src/lib/db/playerProfile');
  const { getMariaPool } = await import('../src/lib/db/mariadb');
  try {
    assert.equal((await runPendingMigrations()).ok, true);
    const rerun = await runPendingMigrations();
    assert.equal(rerun.ok, true);
    assert.deepEqual(rerun.applied, [], 'migration rerun is idempotent');
    const adapter = mariaAuthAdapter();
    const email = `${randomUUID()}@example.invalid`;
    const user = await adapter.createUser!({ id: randomUUID(), email, emailVerified: null, name: 'Test account' });
    assert.equal((await adapter.getUserByEmail!(email))?.id, user.id);
    const identity = { kind: 'account' as const, subject: user.id, displayName: 'Test account', worldId: 'test-world' };
    const key = identityStorageKey(identity);
    const profile = {
      identityKey: key, username: identity.displayName, worldId: identity.worldId,
      position: { x: 7, y: 1, z: -3 }, rotation: { x: 0, y: 0, z: 0 },
      mapId: 'exterior', roleId: null, health: 90, maxHealth: 100,
      stamina: 80, maxStamina: 100, hunger: 70, maxHunger: 100,
      level: 2, experience: 150, inventoryJson: { gold: 123, items: [] },
    };
    await upsertPlayerProfile(profile);
    await upsertPlayerProfile({ ...profile, username: 'Renamed account' });
    const saved = await fetchPlayerProfileByIdentity(key);
    assert.equal(saved?.username, 'Renamed account');
    assert.equal(saved?.pos_x, 7);
    assert.equal(saved?.experience, 150);
    assert.equal(await fetchPlayerProfileByIdentity(identityStorageKey({ ...identity, subject: randomUUID() })), null);
    assert.equal(await fetchPlayerProfileByIdentity(identityStorageKey({ ...identity, worldId: 'other-world' })), null);
    const token = { identifier: email, token: randomUUID(), expires: new Date(Date.now() + 60_000) };
    await adapter.createVerificationToken!(token);
    const claims = await Promise.all(Array.from({ length: 16 }, () => adapter.useVerificationToken!({ identifier: email, token: token.token })));
    assert.equal(claims.filter(Boolean).length, 1, 'concurrent requests consume a magic-link token once');

    // Exercise Auth.js itself with the real adapter/callbacks. Capture email in
    // memory, so no message or credentials are sent to an external provider.
    const { Auth } = await import('@auth/core');
    const { default: Nodemailer } = await import('@auth/core/providers/nodemailer');
    const { authConfig } = await import('../src/auth');
    let loginUrl = '';
    const secret = 'isolated-auth-session-secret-at-least-32-characters';
    const config = {
      ...authConfig, secret, basePath: '/api/auth',
      providers: [Nodemailer({
        server: 'smtp://localhost:2525',
        sendVerificationRequest: async ({ url }) => { loginUrl = url; },
      })],
    };
    const origin = 'http://localhost:33000';
    const csrf = await Auth(new Request(`${origin}/api/auth/csrf`), config);
    const csrfBody = await csrf.json() as { csrfToken: string };
    const cookies = csrf.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
    const signin = await Auth(new Request(`${origin}/api/auth/signin/nodemailer`, {
      method: 'POST', headers: { cookie: cookies, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email, csrfToken: csrfBody.csrfToken, callbackUrl: `${origin}/game` }),
    }), config);
    assert.equal(signin.status, 302);
    assert.ok(loginUrl.startsWith(`${origin}/api/auth/callback/nodemailer?`));
    const callback = await Auth(new Request(loginUrl, { headers: { cookie: cookies } }), config);
    const sessionCookies = callback.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
    const sessionResponse = await Auth(new Request(`${origin}/api/auth/session`, {
      headers: { cookie: sessionCookies },
    }), config);
    const session = await sessionResponse.json() as { user?: { id: string } };
    assert.equal(session.user?.id, user.id, 'real email login resolves the stable account ID');
    const { issueWorldTicket, verifyWorldTicket } = await import('../src/lib/auth/worldIdentity');
    const authenticatedIdentity = { ...identity, subject: session.user!.id };
    const ticket = issueWorldTicket(authenticatedIdentity, 'nexus-world', secret);
    assert.equal(identityStorageKey(verifyWorldTicket(ticket, 'nexus-world', secret)), key);

    const { createServer } = await import('node:http');
    // Match the CJS entry used by the tsx-transpiled room. Loading another ESM
    // copy of Colyseus makes its prototype-based onAuth detection disagree.
    const loadModule = createRequire(import.meta.url);
    const { Server } = loadModule('colyseus') as typeof import('colyseus');
    const { WebSocketTransport } = loadModule('@colyseus/ws-transport') as typeof import('@colyseus/ws-transport');
    const { Client } = await import('colyseus.js');
    const { NexusWorldRoom } = await import('../server/rooms/NexusWorldRoom');
    const { PROTOCOL_VERSION, PlayerMessages, EconomyMessages, SceneMessages } = await import('../packages/protocol/src');
    const { GAME_CONFIG } = await import('../src/constants/game');
    const { writeSceneDocumentV0_1ToDisk, tryLoadSceneDocumentV0_1FromDisk } = await import('../server/scene/persistSceneDocumentV0_1');
    const { loadContentManifestOrThrow } = await import('../server/content/loadContentManifest');
    loadContentManifestOrThrow();
    writeSceneDocumentV0_1ToDisk({ schemaVersion: 1, worldId: identity.worldId, entities: [],
      spawn: { mapId: 'exterior', position: [90, 5, 90], yaw: 1 } });
    assert.equal(tryLoadSceneDocumentV0_1FromDisk(identity.worldId)?.spawn?.position[0], 90);
    const { saveWorldAccess } = await import('../server/scene/publicWorlds');
    saveWorldAccess({ worldId: identity.worldId, name: 'Isolated SQL world', public: true });
    process.env.NEXUS_GAME_AUTH_SECRET = secret;
    const http = createServer();
    const gameServer = new Server({ transport: new WebSocketTransport({ server: http }), greet: false });
    gameServer.define('integration-world', NexusWorldRoom);
    await gameServer.listen(0, '127.0.0.1');
    try {
      const address = http.address();
      assert.ok(address && typeof address === 'object');
      const client = new Client(`ws://127.0.0.1:${address.port}`);
      const options = { protocolVersion: PROTOCOL_VERSION,
        gameTicket: issueWorldTicket(authenticatedIdentity, 'integration-world', secret) };
      const first = await client.joinOrCreate('integration-world', options);
      first.onMessage('*', () => {});
      const deposited = new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('deposit timeout')), 3000);
        first.onMessage(EconomyMessages.Bank, data => {
          if (data.amount > 0) { clearTimeout(timeout); resolve(data.amount); }
        });
      });
      first.send(EconomyMessages.Deposit, { amount: 10 });
      const bankBalance = await deposited;
      first.send(PlayerMessages.Move, { position: { x: 8, y: 1, z: -3 }, rotation: { x: 0, y: 0, z: 0 } });
      await first.leave();
      const deadline = Date.now() + 5000;
      while ((await fetchPlayerProfileByIdentity(key))?.pos_x !== 8 && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      assert.equal((await fetchPlayerProfileByIdentity(key))?.pos_x, 8, 'WebSocket leave persists movement');
      const storedProfile = await fetchPlayerProfileByIdentity(key);
      const storedStats = typeof storedProfile?.stats_json === 'string'
        ? JSON.parse(storedProfile.stats_json) : storedProfile?.stats_json;
      assert.equal(storedStats.economy.bankMinor, Math.round(bankBalance * 100));
      assert.equal(storedStats.economy.daily.depositMinor, 1000);
      const second = await client.joinOrCreate('integration-world', options);
      second.onMessage('*', () => {});
      const loadedSpawn = new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('account scene spawn timeout')), 3000);
        second.onMessage(SceneMessages.AppliedDocumentV0_1, data => {
          clearTimeout(timeout); resolve(data.document.spawn.position[0]);
        });
      });
      assert.equal(await loadedSpawn, 90, 'the reconnecting account actually received the scene spawn');
      const restoredBank = new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('restored bank timeout')), 3000);
        second.onMessage(EconomyMessages.Bank, data => { clearTimeout(timeout); resolve(data.amount); });
      });
      const restoredWallet = new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('restored wallet timeout')), 3000);
        second.onMessage(EconomyMessages.Wallet, data => { clearTimeout(timeout); resolve(data.amount); });
      });
      second.send(EconomyMessages.Request, {});
      assert.equal(await restoredBank, bankBalance, 'bank survives an authenticated reconnect');
      assert.equal(await restoredWallet, GAME_CONFIG.currency.startingBalance - 10, 'wallet does not reset on reconnect');
      const snapshot = new Promise<{ players: Array<{ id: string; position: { x: number } }> }>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('map snapshot timeout')), 3000);
        second.onMessage('map:update', data => { clearTimeout(timeout); resolve(data); });
      });
      second.send('map:request', { mapId: 'exterior' });
      const map = await snapshot;
      assert.equal(map.players.find(p => p.id === second.sessionId)?.position.x, 8, 'saved account position wins over the scene spawn at x=90');
      await second.leave();
    } finally {
      await gameServer.gracefullyShutdown(false);
    }
  } finally {
    await getMariaPool()?.end();
    globalThis.__nexusMariaPool = undefined;
    if (previousSceneDir === undefined) delete process.env.NEXUS_SCENE_PERSIST_DIR; else process.env.NEXUS_SCENE_PERSIST_DIR = previousSceneDir;
    if (previousSceneLoad === undefined) delete process.env.NEXUS_SCENE_LOAD_PERSISTED; else process.env.NEXUS_SCENE_LOAD_PERSISTED = previousSceneLoad;
    rmSync(sceneDirectory, { recursive: true });
  }
});
