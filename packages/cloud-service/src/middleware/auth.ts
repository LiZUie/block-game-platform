import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, UserProfile } from '@blockgame/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'blockgame_cloud_super_secret_key_2026';

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

export function generateToken(user: UserProfile): string {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role, status: user.status },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token autentikasi tidak ditemukan' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token tidak valid atau telah kadaluarsa' });
    }
    req.user = decoded as UserProfile;
    next();
  });
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Harus login terlebih dahulu' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Akses ditolak. Fitur ini hanya untuk peran: ${allowedRoles.join(', ')}`,
        currentRole: req.user.role
      });
    }

    next();
  };
}

export function requireActiveAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Harus login terlebih dahulu' });
  }

  if (req.user.role === UserRole.DEVELOPER && req.user.status === 'PENDING') {
    return res.status(403).json({
      error: 'Akun Developer Anda masih menunggu persetujuan (approval) dari Cloud Admin.',
      status: 'PENDING'
    });
  }

  if (req.user.status === 'REJECTED') {
    return res.status(403).json({
      error: 'Akun Anda berstatus REJECTED. Silakan hubungi Cloud Admin.',
      status: 'REJECTED'
    });
  }

  next();
}
