import { Router, Response } from 'express';
import os from 'node:os';
import { db } from '../db.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { UserRole } from '@blockgame/shared';

const router = Router();

// Semua rute admin diproteksi untuk role ADMIN saja
router.use(authenticateToken, requireRole(UserRole.ADMIN));

// 1. System Metrics & Cloud Status
router.get('/metrics', (req: AuthenticatedRequest, res: Response) => {
  const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0;
  const totalGames = (db.prepare('SELECT COUNT(*) as count FROM games').get() as any)?.count || 0;
  const totalPlays = (db.prepare('SELECT SUM(play_count) as count FROM games').get() as any)?.count || 0;
  const totalScores = (db.prepare('SELECT COUNT(*) as count FROM scores').get() as any)?.count || 0;
  const pendingDevsCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'DEVELOPER' AND status = 'PENDING'").get() as any)?.count || 0;

  // Breakdown users by role
  const rolesBreakdown = db.prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role').all() as any[];

  res.json({
    metrics: {
      totalUsers,
      totalGames,
      totalPlays: totalPlays || 0,
      totalScores,
      pendingDevsCount,
      roles: rolesBreakdown
    },
    system: {
      status: 'ONLINE',
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      osPlatform: os.platform(),
      osUptimeHours: (os.uptime() / 3600).toFixed(1),
      nodeVersion: process.version
    }
  });
});

// 2. User Management
router.get('/users', (req: AuthenticatedRequest, res: Response) => {
  const users = db.prepare(`
    SELECT id, username, email, role, status, created_at
    FROM users
    ORDER BY created_at DESC
  `).all();

  res.json({ users });
});

// 3. Pending Developers List
router.get('/pending-developers', (req: AuthenticatedRequest, res: Response) => {
  const pendingUsers = db.prepare(`
    SELECT id, username, email, role, status, created_at
    FROM users
    WHERE role = 'DEVELOPER' AND status = 'PENDING'
    ORDER BY created_at DESC
  `).all();

  res.json({ pendingUsers });
});

// 4. Approve Developer Account
router.post('/users/:id/approve', (req: AuthenticatedRequest, res: Response) => {
  const user = db.prepare('SELECT id, username, role, status FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan' });
  }

  db.prepare("UPDATE users SET status = 'ACTIVE' WHERE id = ?").run(req.params.id);

  // Catat audit log
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    logId,
    req.user!.id,
    'APPROVE_DEVELOPER',
    `Admin ${req.user!.username} menyetujui akun developer: ${user.username} (${user.id})`,
    new Date().toISOString()
  );

  res.json({ message: `Akun developer ${user.username} berhasil disetujui (ACTIVE)!` });
});

// 5. Reject Developer Account
router.post('/users/:id/reject', (req: AuthenticatedRequest, res: Response) => {
  const user = db.prepare('SELECT id, username, role, status FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan' });
  }

  db.prepare("UPDATE users SET status = 'REJECTED' WHERE id = ?").run(req.params.id);

  // Catat audit log
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    logId,
    req.user!.id,
    'REJECT_DEVELOPER',
    `Admin ${req.user!.username} menolak akun developer: ${user.username} (${user.id})`,
    new Date().toISOString()
  );

  res.json({ message: `Akun developer ${user.username} ditolak (REJECTED).` });
});

// 6. Change User Role (Promote Player to Developer, etc.)
router.patch('/users/:id/role', (req: AuthenticatedRequest, res: Response) => {
  const { role } = req.body;
  if (!Object.values(UserRole).includes(role)) {
    return res.status(400).json({ error: 'Role tidak valid' });
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ message: `Role user berhasil diubah menjadi ${role}` });
});

// 7. Change User Status Directly
router.patch('/users/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  if (!['ACTIVE', 'PENDING', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Status tidak valid' });
  }

  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: `Status user berhasil diubah menjadi ${status}` });
});

export default router;
