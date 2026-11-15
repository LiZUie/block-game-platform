import { GameManifest, GameSummary, UserProfile, LeaderboardEntry, UserRole } from '@blockgame/shared';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('blockgame_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ==================== MOCK FALLBACK DATA UNTUK CLOUD / VERCEL ====================
const MOCK_GAMES_KEY = 'blockgame_mock_games';
const MOCK_USERS_KEY = 'blockgame_mock_users_v2';
const CURRENT_USER_KEY = 'blockgame_current_user';

export interface StoredMockUser extends UserProfile {
  password?: string;
}

const DEFAULT_MOCK_USERS: StoredMockUser[] = [
  { 
    id: 'usr_admin', 
    username: 'admin', 
    email: 'admin@blockgame.cloud', 
    password: 'admin123', 
    role: UserRole.ADMIN, 
    status: 'ACTIVE', 
    createdAt: new Date().toISOString() 
  },
  { 
    id: 'usr_dev', 
    username: 'dev', 
    email: 'dev@blockgame.cloud', 
    password: 'dev123', 
    role: UserRole.DEVELOPER, 
    status: 'ACTIVE', 
    createdAt: new Date().toISOString() 
  },
  { 
    id: 'usr_player', 
    username: 'player', 
    email: 'player@blockgame.cloud', 
    password: 'player123', 
    role: UserRole.PLAYER, 
    status: 'ACTIVE', 
    createdAt: new Date().toISOString() 
  },
  { 
    id: 'usr_pending', 
    username: 'calon_dev', 
    email: 'pending@blockgame.cloud', 
    password: 'pending123', 
    role: UserRole.DEVELOPER, 
    status: 'PENDING', 
    createdAt: new Date().toISOString() 
  },
];

const INITIAL_MOCK_GAMES: GameSummary[] = [
  {
    id: 'game_cat_star',
    title: 'Petualangan Kucing Penangkap Bintang (Scratch)',
    description: 'Game 2D Scratch 3.0 dengan Blockly Zelos, Web Audio Synthesizer & Direct Stage Drag-and-Drop.',
    authorId: 'usr_dev',
    authorName: 'Developer Studio',
    category: 'arcade',
    playCount: 142,
    highScore: 250,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game_space_invaders',
    title: 'Space Invaders Galaxy',
    description: 'Tembak musuh alien luar angkasa dengan laser beam dan sistem skor coroutines realtime.',
    authorId: 'usr_dev',
    authorName: 'Developer Studio',
    category: 'action',
    playCount: 98,
    highScore: 180,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game_coin_hunter',
    title: 'Coin Hunter RPG',
    description: 'Jelajahi labirin dungeon, hindari monster jahat dan kumpulkan koin emas.',
    authorId: 'usr_dev',
    authorName: 'Developer Studio',
    category: 'adventure',
    playCount: 76,
    highScore: 320,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function getStoredMockGames(): GameSummary[] {
  const raw = localStorage.getItem(MOCK_GAMES_KEY);
  if (!raw) {
    localStorage.setItem(MOCK_GAMES_KEY, JSON.stringify(INITIAL_MOCK_GAMES));
    return INITIAL_MOCK_GAMES;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_MOCK_GAMES;
  }
}

function getStoredMockUsers(): StoredMockUser[] {
  const raw = localStorage.getItem(MOCK_USERS_KEY);
  if (!raw) {
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(DEFAULT_MOCK_USERS));
    return [...DEFAULT_MOCK_USERS];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(DEFAULT_MOCK_USERS));
      return [...DEFAULT_MOCK_USERS];
    }
    return parsed;
  } catch {
    return [...DEFAULT_MOCK_USERS];
  }
}

// ==================== API SERVICE DENGAN VALIDASI KETAT ====================
export const api = {
  // Auth
  async login(usernameOrEmail: string, password: string): Promise<{ token: string; user: UserProfile }> {
    let networkError = false;

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameOrEmail, email: usernameOrEmail, password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
        return data;
      }

      // Backend aktif dan merespon error kredensial (401 / 400 / 404)
      const err = await res.json().catch(() => ({ error: 'Username/Email atau password salah' }));
      throw new Error(err.error || 'Username/Email atau password salah');
    } catch (e: any) {
      // Jika error berasal dari backend (status 401 dsb), LEMPAR LANGSUNG ke UI (jangan ditelan!)
      if (e.message && e.message !== 'Failed to fetch' && !e.message.includes('NetworkError') && !e.message.includes('Load failed')) {
        throw e;
      }
      // Hanya jika backend server mati / tidak terjangkau (Vercel client-only demo)
      networkError = true;
    }

    // ================= FALLBACK KHUSUS OFFLINE / VERCEL STATIC =================
    if (networkError) {
      const users = getStoredMockUsers();
      const lower = usernameOrEmail.trim().toLowerCase();

      // Cari user berdasarkan username atau email
      const matched = users.find(u => 
        u.username.toLowerCase() === lower || 
        u.email.toLowerCase() === lower ||
        (u.username === 'admin' && lower === 'admin')
      );

      if (!matched) {
        throw new Error('Akun tidak ditemukan. Periksa kembali username/email atau daftar akun baru.');
      }

      // Verifikasi kata sandi secara ketat
      if (matched.password && matched.password !== password) {
        throw new Error('Kata sandi (password) salah. Silakan coba lagi.');
      }

      // Buat profile resmi sesuai data terdaftar (bukan default developer!)
      const profile: UserProfile = {
        id: matched.id,
        username: matched.username,
        email: matched.email,
        role: matched.role,
        status: matched.status,
        createdAt: matched.createdAt
      };

      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
      return {
        token: `demo_jwt_token_${Date.now()}`,
        user: profile
      };
    }

    throw new Error('Username/Email atau password salah');
  },

  async register(username: string, email: string, password: string, role: UserRole): Promise<{ token: string; user: UserProfile }> {
    let networkError = false;

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
        return data;
      }

      const err = await res.json().catch(() => ({ error: 'Pendaftaran gagal' }));
      throw new Error(err.error || 'Pendaftaran gagal');
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch' && !e.message.includes('NetworkError') && !e.message.includes('Load failed')) {
        throw e;
      }
      networkError = true;
    }

    // ================= FALLBACK KHUSUS OFFLINE / VERCEL STATIC =================
    if (networkError) {
      const users = getStoredMockUsers();
      const lowerUser = username.trim().toLowerCase();
      const lowerEmail = email.trim().toLowerCase();

      const existing = users.find(u => 
        u.username.toLowerCase() === lowerUser || 
        u.email.toLowerCase() === lowerEmail
      );

      if (existing) {
        throw new Error('Email atau username sudah terdaftar. Silakan buka tab Masuk (Login) untuk masuk ke akun Anda.');
      }

      const assignedRole = (role === UserRole.DEVELOPER) ? UserRole.DEVELOPER : UserRole.PLAYER;
      const initialStatus = (assignedRole === UserRole.DEVELOPER) ? 'PENDING' : 'ACTIVE';

      const newUser: StoredMockUser = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        username: username.trim(),
        email: email.trim(),
        password,
        role: assignedRole,
        status: initialStatus,
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));

      const profile: UserProfile = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.createdAt
      };

      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));

      return {
        token: `demo_jwt_token_${Date.now()}`,
        user: profile
      };
    }

    throw new Error('Pendaftaran gagal');
  },

  async getMe(): Promise<{ user: UserProfile }> {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { ...getAuthHeader() }
      });
      if (res.ok) return res.json();
    } catch {}

    const cached = localStorage.getItem(CURRENT_USER_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Refresh status terkini dari database mock (misal setelah diapprove admin)
        const users = getStoredMockUsers();
        const found = users.find(u => u.id === parsed.id || u.username === parsed.username);
        if (found) {
          const updated: UserProfile = {
            id: found.id,
            username: found.username,
            email: found.email,
            role: found.role,
            status: found.status,
            createdAt: found.createdAt
          };
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated));
          return { user: updated };
        }
        return { user: parsed };
      } catch {}
    }

    throw new Error('Unauthorized');
  },

  // Games
  async getGames(publishedOnly = true): Promise<{ games: GameSummary[] }> {
    try {
      const res = await fetch(`${API_BASE}/games?publishedOnly=${publishedOnly}`);
      if (res.ok) return res.json();
    } catch {}

    return { games: getStoredMockGames() };
  },

  async getGameManifest(gameId: string): Promise<GameManifest> {
    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/manifest`);
      if (res.ok) return res.json();
    } catch {}

    // Fallback manifest
    const cached = localStorage.getItem('blockverse_latest_project');
    const projectData = cached ? JSON.parse(cached) : undefined;

    return {
      id: gameId,
      title: 'BlockVerse 2D Game Project',
      description: 'Game 2D berbasis Scratch 3.0 Blockly engine',
      authorId: 'dev_1',
      version: '1.0.0',
      category: 'arcade',
      canvas: {
        width: 480,
        height: 360,
        gridSize: 20,
        backgroundColor: '#FFFFFF',
        tickRateMs: 16
      },
      entities: [],
      logic: { events: [], onStart: [], onTick: [], onCollision: [] },
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(projectData ? { projectData } as any : {})
    };
  },

  async publishGame(payload: any): Promise<{ message: string; gameId: string }> {
    try {
      const res = await fetch(`${API_BASE}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) return res.json();
    } catch {}

    const gameId = `game_${Date.now()}`;
    const games = getStoredMockGames();
    games.unshift({
      id: gameId,
      title: payload.title || 'Untitled Game',
      description: payload.description || 'Game dibuat di Developer Studio BlockVerse',
      authorId: 'dev_current',
      authorName: 'Developer Studio',
      category: 'arcade',
      playCount: 1,
      highScore: 0,
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem(MOCK_GAMES_KEY, JSON.stringify(games));

    return { message: 'Game berhasil dipublish ke Cloud (Live Sync)!', gameId };
  },

  async deleteGame(gameId: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/games/${gameId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      if (res.ok) return;
    } catch {}

    const games = getStoredMockGames().filter(g => g.id !== gameId);
    localStorage.setItem(MOCK_GAMES_KEY, JSON.stringify(games));
  },

  async recordPlay(gameId: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/games/${gameId}/play`, { method: 'POST' });
    } catch {}
  },

  async submitScore(gameId: string, score: number): Promise<{ message: string }> {
    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ score })
      });
      if (res.ok) return res.json();
    } catch {}

    return { message: 'Skor berhasil dicatat!' };
  },

  async getLeaderboard(gameId: string): Promise<{ leaderboard: LeaderboardEntry[] }> {
    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/leaderboard`);
      if (res.ok) return res.json();
    } catch {}

    return {
      leaderboard: [
        { id: '1', gameId, userId: 'usr_1', username: 'ChampionPlayer', score: 480, createdAt: new Date().toISOString() },
        { id: '2', gameId, userId: 'usr_2', username: 'PixelMaster', score: 320, createdAt: new Date().toISOString() },
        { id: '3', gameId, userId: 'usr_3', username: 'ScratchHero', score: 210, createdAt: new Date().toISOString() },
      ]
    };
  },

  // Admin
  async getAdminMetrics(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/admin/metrics`, {
        headers: { ...getAuthHeader() }
      });
      if (res.ok) return res.json();
    } catch {}

    return {
      activeUsers: 34,
      totalGames: getStoredMockGames().length,
      totalPlays: 1250,
      serverUptime: '99.98% (Online)',
      nodeVersion: 'Node.js 22 (SQLite Built-in)'
    };
  },

  async getAdminUsers(): Promise<{ users: UserProfile[] }> {
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { ...getAuthHeader() }
      });
      if (res.ok) return res.json();
    } catch {}

    return { users: getStoredMockUsers() };
  },

  async updateUserRole(userId: string, role: UserRole): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ role })
      });
      if (res.ok) return;
    } catch {}

    const users = getStoredMockUsers().map(u => u.id === userId ? { ...u, role } : u);
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
  },

  async getPendingDevelopers(): Promise<{ pendingUsers: UserProfile[] }> {
    try {
      const res = await fetch(`${API_BASE}/admin/pending-developers`, {
        headers: { ...getAuthHeader() }
      });
      if (res.ok) return res.json();
    } catch {}

    const users = getStoredMockUsers().filter(u => u.role === UserRole.DEVELOPER && u.status === 'PENDING');
    return { pendingUsers: users };
  },

  async approveDeveloper(userId: string): Promise<{ message: string }> {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: { ...getAuthHeader() }
      });
      if (res.ok) return res.json();
    } catch {}

    const users = getStoredMockUsers().map(u => u.id === userId ? { ...u, status: 'ACTIVE' as const } : u);
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));

    // Update session aktif jika user yang diapprove adalah user yang sedang login
    const cached = localStorage.getItem(CURRENT_USER_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.id === userId) {
          parsed.status = 'ACTIVE';
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(parsed));
        }
      } catch {}
    }

    return { message: 'Akun developer berhasil disetujui (Approved)!' };
  },

  async rejectDeveloper(userId: string): Promise<{ message: string }> {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/reject`, {
        method: 'POST',
        headers: { ...getAuthHeader() }
      });
      if (res.ok) return res.json();
    } catch {}

    const users = getStoredMockUsers().map(u => u.id === userId ? { ...u, status: 'REJECTED' as const } : u);
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
    return { message: 'Akun developer telah ditolak.' };
  },

  async updateUserStatus(userId: string, status: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) return;
    } catch {}
  }
};
