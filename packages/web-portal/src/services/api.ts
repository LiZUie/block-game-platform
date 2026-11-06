import { GameManifest, GameSummary, UserProfile, LeaderboardEntry, UserRole } from '@blockgame/shared';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('blockgame_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export const api = {
  // Auth
  async login(usernameOrEmail: string, password: string): Promise<{ token: string; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameOrEmail, email: usernameOrEmail, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login gagal');
    }
    return res.json();
  },

  async register(username: string, email: string, password: string, role: UserRole): Promise<{ token: string; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Pendaftaran gagal');
    }
    return res.json();
  },

  async getMe(): Promise<{ user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
  },

  // Games
  async getGames(publishedOnly = true): Promise<{ games: GameSummary[] }> {
    const res = await fetch(`${API_BASE}/games?publishedOnly=${publishedOnly}`);
    if (!res.ok) throw new Error('Gagal mengambil daftar game');
    return res.json();
  },

  async getGameManifest(gameId: string): Promise<GameManifest> {
    const res = await fetch(`${API_BASE}/games/${gameId}/manifest`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal memuat manifest game');
    }
    return res.json();
  },

  async publishGame(payload: Partial<GameManifest>): Promise<{ message: string; gameId: string }> {
    const res = await fetch(`${API_BASE}/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal mempublish game ke cloud');
    }
    return res.json();
  },

  async deleteGame(gameId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/games/${gameId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menghapus game');
    }
  },

  async recordPlay(gameId: string): Promise<void> {
    await fetch(`${API_BASE}/games/${gameId}/play`, { method: 'POST' });
  },

  async submitScore(gameId: string, score: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/games/${gameId}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ score })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menyimpan skor');
    }
    return res.json();
  },

  async getLeaderboard(gameId: string): Promise<{ leaderboard: LeaderboardEntry[] }> {
    const res = await fetch(`${API_BASE}/games/${gameId}/leaderboard`);
    if (!res.ok) throw new Error('Gagal mengambil leaderboard');
    return res.json();
  },

  // Admin
  async getAdminMetrics(): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/metrics`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Akses admin ditolak');
    }
    return res.json();
  },

  async getAdminUsers(): Promise<{ users: UserProfile[] }> {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Gagal memuat pengguna');
    return res.json();
  },

  async updateUserRole(userId: string, role: UserRole): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ role })
    });
    if (!res.ok) throw new Error('Gagal mengubah role');
  },

  async getPendingDevelopers(): Promise<{ pendingUsers: UserProfile[] }> {
    const res = await fetch(`${API_BASE}/admin/pending-developers`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Gagal mengambil daftar developer pending');
    return res.json();
  },

  async approveDeveloper(userId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/approve`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menyetujui akun developer');
    }
    return res.json();
  },

  async rejectDeveloper(userId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/reject`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menolak akun developer');
    }
    return res.json();
  },

  async updateUserStatus(userId: string, status: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Gagal mengubah status');
  }
};
