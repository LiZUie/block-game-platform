import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { generateToken, authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { UserRole, UserProfile } from '@blockgame/shared';

const router = Router();

// Login
router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi' });
  }

  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  const user = stmt.get(email) as any;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email atau password salah' });
  }

  const profile: UserProfile = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role as UserRole,
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

  // Default role adalah PLAYER jika tidak ditentukan (atau jika mencoba register admin secara publik, batasi ke PLAYER/DEVELOPER)
  const assignedRole = (role === UserRole.DEVELOPER) ? UserRole.DEVELOPER : UserRole.PLAYER;

  const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insert.run(id, username, email, passwordHash, assignedRole, now);

  const profile: UserProfile = {
    id,
    username,
    email,
    role: assignedRole,
    createdAt: now
  };

  const token = generateToken(profile);
  res.status(201).json({ token, user: profile });
});

// Current User Profile
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

export default router;
