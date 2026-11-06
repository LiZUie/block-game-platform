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

  // Breakdown users by role
  const rolesBreakdown = db.prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role').all() as any[];

  res.json({
    metrics: {
      totalUsers,
      totalGames,
      totalPlays: totalPlays || 0,
      totalScores,
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
    SELECT id, username, email, role, created_at
    FROM users
    ORDER BY created_at DESC
  `).all();

  res.json({ users });
});

// 3. Change User Role (Promote Player to Developer, etc.)
router.patch('/users/:id/role', (req: AuthenticatedRequest, res: Response) => {
  const { role } = req.body;
  if (!Object.values(UserRole).includes(role)) {
    return res.status(400).json({ error: 'Role tidak valid' });
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ message: `Role user berhasil diubah menjadi ${role}` });
});

export default router;
