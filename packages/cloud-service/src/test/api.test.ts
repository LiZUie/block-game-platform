import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { initDatabase } from '../db.js';
import authRoutes from '../routes/auth.js';
import gamesRoutes from '../routes/games.js';
import adminRoutes from '../routes/admin.js';

describe('Cloud Game Service API Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let devToken = '';
  let playerToken = '';
  let adminToken = '';

  before(async () => {
    initDatabase();
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/games', gamesRoutes);
    app.use('/api/admin', adminRoutes);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  it('1. Login with Admin, Developer, and Player credentials', async () => {
    // Admin
    const resAdmin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@blockgame.cloud', password: 'admin123' })
    });
    assert.strictEqual(resAdmin.status, 200);
    const adminData = await resAdmin.json() as any;
    assert.strictEqual(adminData.user.role, 'ADMIN');
    adminToken = adminData.token;

    // Developer
    const resDev = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dev@blockgame.cloud', password: 'dev123' })
    });
    assert.strictEqual(resDev.status, 200);
    const devData = await resDev.json() as any;
    assert.strictEqual(devData.user.role, 'DEVELOPER');
    devToken = devData.token;

    // Player
    const resPlayer = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'player@blockgame.cloud', password: 'player123' })
    });
    assert.strictEqual(resPlayer.status, 200);
    const playerData = await resPlayer.json() as any;
    assert.strictEqual(playerData.user.role, 'PLAYER');
    playerToken = playerData.token;
  });

  it('2. Fetch catalog and get seeded Snake game manifest', async () => {
    const res = await fetch(`${baseUrl}/api/games`);
    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    assert.ok(data.games.length >= 1);
    const snakeGame = data.games.find((g: any) => g.id === 'game_snake_classic');
    assert.ok(snakeGame);

    // Get manifest
    const resManifest = await fetch(`${baseUrl}/api/games/game_snake_classic/manifest`);
    assert.strictEqual(resManifest.status, 200);
    const manifest = await resManifest.json() as any;
    assert.strictEqual(manifest.title, 'Ular Makan Apel (Classic Snake 2D)');
    assert.strictEqual(manifest.canvas.gridSize, 20);
    assert.strictEqual(manifest.entities.length, 2);
    assert.ok(manifest.logic.blocks.length >= 5);
  });

  it('3. RBAC Check: Player CANNOT publish game, Developer CAN publish game', async () => {
    const newGamePayload = {
      title: 'Pong Test',
      description: 'Game pantul bola',
      canvas: { width: 400, height: 400, gridSize: 20, backgroundColor: '#000', tickRateMs: 100 },
      entities: [],
      logic: { version: '1.0', blocks: [] }
    };

    // Try with Player token -> MUST BE 403 FORBIDDEN
    const resPlayerPublish = await fetch(`${baseUrl}/api/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${playerToken}`
      },
      body: JSON.stringify(newGamePayload)
    });
    assert.strictEqual(resPlayerPublish.status, 403);

    // Try with Developer token -> MUST BE 201 CREATED
    const resDevPublish = await fetch(`${baseUrl}/api/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${devToken}`
      },
      body: JSON.stringify(newGamePayload)
    });
    assert.strictEqual(resDevPublish.status, 201);
  });

  it('4. Admin Metrics endpoint is accessible only by Admin', async () => {
    // Try with devToken -> 403
    const resDev = await fetch(`${baseUrl}/api/admin/metrics`, {
      headers: { 'Authorization': `Bearer ${devToken}` }
    });
    assert.strictEqual(resDev.status, 403);

    // Try with adminToken -> 200
    const resAdmin = await fetch(`${baseUrl}/api/admin/metrics`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(resAdmin.status, 200);
    const data = await resAdmin.json() as any;
    assert.ok(data.metrics.totalUsers >= 3);
    assert.strictEqual(data.system.status, 'ONLINE');
  });

  it('5. Developer Account Approval Workflow: PENDING -> Admin Approve -> ACTIVE', async () => {
    const testDevUsername = `newdev_${Date.now()}`;
    const testDevEmail = `${testDevUsername}@blockgame.cloud`;

    // 1. Register as DEVELOPER
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testDevUsername,
        email: testDevEmail,
        password: 'password123',
        role: 'DEVELOPER'
      })
    });
    assert.strictEqual(regRes.status, 201);
    const regData = await regRes.json() as any;
    assert.strictEqual(regData.user.role, 'DEVELOPER');
    assert.strictEqual(regData.user.status, 'PENDING');
    const newDevToken = regData.token;
    const newDevId = regData.user.id;

    // 2. Pending developer CANNOT publish games yet
    const publishAttempt = await fetch(`${baseUrl}/api/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newDevToken}`
      },
      body: JSON.stringify({
        title: 'Pending Game Test',
        canvas: { width: 400, height: 400, gridSize: 20 },
        entities: [],
        logic: { blocks: [] }
      })
    });
    assert.strictEqual(publishAttempt.status, 403);
    const publishErr = await publishAttempt.json() as any;
    assert.strictEqual(publishErr.status, 'PENDING');

    // 3. Admin checks pending developers list
    const pendingRes = await fetch(`${baseUrl}/api/admin/pending-developers`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(pendingRes.status, 200);
    const pendingData = await pendingRes.json() as any;
    const found = pendingData.pendingUsers.find((u: any) => u.id === newDevId);
    assert.ok(found, 'Pending user must be listed in admin pending list');

    // 4. Admin approves the developer
    const approveRes = await fetch(`${baseUrl}/api/admin/users/${newDevId}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(approveRes.status, 200);

    // 5. Check /api/auth/me for the developer returns ACTIVE
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${newDevToken}` }
    });
    assert.strictEqual(meRes.status, 200);
    const meData = await meRes.json() as any;
    assert.strictEqual(meData.user.status, 'ACTIVE');

    // 6. Now log in to get a fresh token reflecting ACTIVE status
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testDevEmail, password: 'password123' })
    });
    assert.strictEqual(loginRes.status, 200);
    const freshData = await loginRes.json() as any;
    assert.strictEqual(freshData.user.status, 'ACTIVE');

    // 7. Approved developer can now publish games
    const publishSuccess = await fetch(`${baseUrl}/api/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freshData.token}`
      },
      body: JSON.stringify({
        title: 'Approved Developer Game',
        description: 'Successfully approved game',
        category: 'adventure',
        canvas: { width: 400, height: 400, gridSize: 20 },
        entities: [{ id: 'hero', name: 'Hero', type: 'player' }],
        logic: { version: '1.0', blocks: [] }
      })
    });
    assert.strictEqual(publishSuccess.status, 201);
  });
});
