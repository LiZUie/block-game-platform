import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { generateToken, authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { UserRole, UserProfile, AccountStatus } from '@blockgame/shared';

const router = Router();

// Login (Mendukung Login via Username ATAU Email)
router.post('/login', (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  const loginIdentifier = username || email;

  if (!loginIdentifier || !password) {
    return res.status(400).json({ error: 'Username/Email dan password wajib diisi' });
  }

  const stmt = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?');
  const user = stmt.get(loginIdentifier, loginIdentifier) as any;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Username/Email atau password salah' });
  }

  const profile: UserProfile = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role as UserRole,
    status: (user.status as AccountStatus) || 'ACTIVE',
    createdAt: user.created_at
  };

  const token = generateToken(profile);
  res.json({ token, user: profile });
});

// Register
router.post('/register', (req: Request, res: Response) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, dan password wajib diisi' });
  }

  // Cek apakah user/email sudah ada
  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existing) {
    return res.status(409).json({ error: 'Email atau username sudah terdaftar' });
  }

  // Developer yang baru mendaftar default statusnya 'PENDING' (perlu approval Admin)
  // Player default statusnya 'ACTIVE'
  const assignedRole = (role === UserRole.DEVELOPER) ? UserRole.DEVELOPER : UserRole.PLAYER;
  const initialStatus: AccountStatus = (assignedRole === UserRole.DEVELOPER) ? 'PENDING' : 'ACTIVE';

  const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(id, username, email, passwordHash, assignedRole, initialStatus, now);

  const profile: UserProfile = {
    id,
    username,
    email,
    role: assignedRole,
    status: initialStatus,
    createdAt: now
  };

  const token = generateToken(profile);
  res.status(201).json({ token, user: profile });
});

// Current User Profile (query langsung dari DB agar status selalu up to date saat admin approve)
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = db.prepare('SELECT id, username, email, role, status, created_at FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan' });
  }

  const profile: UserProfile = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role as UserRole,
    status: (user.status as AccountStatus) || 'ACTIVE',
    createdAt: user.created_at
  };

  res.json({ user: profile });
});

export default router;
