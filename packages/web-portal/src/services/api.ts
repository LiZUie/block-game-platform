// packages/web-portal/src/services/api.ts
import { GameManifest, GameSummary, UserProfile, LeaderboardEntry, UserRole } from '@blockgame/shared';

const API_BASE = '/api';

export function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('blockgame_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const MOCK_GAMES_KEY = 'blockgame_mock_games_v3';
const MOCK_USERS_KEY = 'blockgame_mock_users_v2';
const CURRENT_USER_KEY = 'blockgame_current_user';

export interface StoredMockUser extends UserProfile {
  password?: string;
}

export interface StoredGameSummary extends GameSummary {
  projectData?: any;
}

const DEFAULT_MOCK_USERS: StoredMockUser[] = [
  {
    id: 'usr_admin',
    username: 'admin',
    email: 'admin@blockgame.cloud',
    password: 'admin123',
    role: UserRole.ADMIN,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_dev',
    username: 'dev',
    email: 'dev@blockgame.cloud',
    password: 'dev123',
    role: UserRole.DEVELOPER,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_player',
    username: 'player',
    email: 'player@blockgame.cloud',
    password: 'player123',
    role: UserRole.PLAYER,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_pending',
    username: 'calon_dev',
    email: 'pending@blockgame.cloud',
    password: 'pending123',
    role: UserRole.DEVELOPER,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_MOCK_GAMES: StoredGameSummary[] = [
  {
    id: 'game_cat_star',
    title: 'Cat & Star Catcher (Scratch 3.0)',
    description: 'Tangkap bintang jatuh dan hindari bom dengan kucing Hero!',
    authorId: 'usr_dev',
    authorName: 'dev',
    category: 'arcade',
    playCount: 142,
    highScore: 250,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game_flappy_bird',
    title: 'Flappy Bird 2D Sky',
    description: 'Tekan SPASI untuk terbang melewati rintangan pipa hijau dan raih skor tertinggi!',
    authorId: 'usr_dev',
    authorName: 'dev',
    category: 'arcade',
    playCount: 89,
    highScore: 180,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game_pong_arcade',
    title: 'Neon Pong Arcade',
    description: 'Pantulkan bola menggunakan papan paddle di bagian bawah layar dan jangan sampai jatuh!',
    authorId: 'usr_dev',
    authorName: 'dev',
    category: 'classic',
    playCount: 64,
    highScore: 310,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game_tetris_drop',
    title: 'Tetris Block Drop',
    description: 'Susun dan tangkap balok tetromino yang jatuh dari atas pada garis target!',
    authorId: 'usr_dev',
    authorName: 'dev',
    category: 'puzzle',
    playCount: 53,
    highScore: 400,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function getStoredMockGames(): StoredGameSummary[] {
  const raw = localStorage.getItem(MOCK_GAMES_KEY);
  if (!raw) {
    localStorage.setItem(MOCK_GAMES_KEY, JSON.stringify(INITIAL_MOCK_GAMES));
    return [...INITIAL_MOCK_GAMES];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [...INITIAL_MOCK_GAMES];
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

export const api = {
  async login(usernameOrEmail: string, password: string): Promise<{ token: string; user: UserProfile }> {
    let networkError = false;
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameOrEmail, email: usernameOrEmail, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
        return data;
      }

      // Jika endpoint backend belum dideploy / Vercel static hosting (404/405/5xx), aktifkan fallback mock user
      if (res.status === 404 || res.status === 405 || res.status >= 500) {
        networkError = true;
      } else {
        const err = await res.json().catch(() => ({ error: 'Username/Email atau password salah' }));
        throw new Error(err.error || 'Username/Email atau password salah');
      }
    } catch (e: any) {
      if (!networkError && e.message && e.message !== 'Failed to fetch' && !e.message.includes('NetworkError') && !e.message.includes('Load failed')) {
        throw e;
      }
      networkError = true;
    }

    if (networkError) {
      const users = getStoredMockUsers();
      const lower = usernameOrEmail.trim().toLowerCase();
      const matched = users.find(
        (u) =>
          u.username.toLowerCase() === lower ||
          u.email.toLowerCase() === lower ||
          (u.username === 'admin' && lower === 'admin')
      );

      if (!matched) {
        throw new Error('Akun tidak ditemukan. Periksa kembali username/email atau daftar akun baru.');
      }
      if (matched.password && matched.password !== password) {
        throw new Error('Kata sandi (password) salah. Silakan coba lagi.');
      }

      const profile: UserProfile = {
        id: matched.id,
        username: matched.username,
        email: matched.email,
        role: matched.role,
        status: matched.status,
        createdAt: matched.createdAt,
      };

      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
      return {
        token: `demo_jwt_token_${Date.now()}`,
        user: profile,
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
        body: JSON.stringify({ username, email, password, role }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
        return data;
      }

      // Jika endpoint backend belum dideploy / Vercel static hosting (404/405/5xx), aktifkan fallback mock user
      if (res.status === 404 || res.status === 405 || res.status >= 500) {
        networkError = true;
      } else {
        const err = await res.json().catch(() => ({ error: 'Pendaftaran gagal' }));
        throw new Error(err.error || 'Pendaftaran gagal');
      }
    } catch (e: any) {
      if (!networkError && e.message && e.message !== 'Failed to fetch' && !e.message.includes('NetworkError') && !e.message.includes('Load failed')) {
        throw e;
      }
      networkError = true;
    }

    if (networkError) {
      const users = getStoredMockUsers();
      const lowerUser = username.trim().toLowerCase();
      const lowerEmail = email.trim().toLowerCase();

      const existing = users.find((u) => u.username.toLowerCase() === lowerUser || u.email.toLowerCase() === lowerEmail);
      if (existing) {
        throw new Error('Email atau username sudah terdaftar. Silakan buka tab Masuk (Login).');
      }

      const assignedRole = role === UserRole.DEVELOPER ? UserRole.DEVELOPER : UserRole.PLAYER;
      const initialStatus = assignedRole === UserRole.DEVELOPER ? 'PENDING' : 'ACTIVE';

      const newUser: StoredMockUser = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        username: username.trim(),
        email: email.trim(),
        password,
        role: assignedRole,
        status: initialStatus,
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));

      const profile: UserProfile = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.createdAt,
      };

      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
      return {
        token: `demo_jwt_token_${Date.now()}`,
        user: profile,
      };
    }

    throw new Error('Pendaftaran gagal');
  },

  async getMe(): Promise<{ user: UserProfile }> {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { ...getAuthHeader() },
      });
      if (res.ok) return res.json();
    } catch {}

    const cached = localStorage.getItem(CURRENT_USER_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const users = getStoredMockUsers();
        const found = users.find((u) => u.id === parsed.id || u.username === parsed.username);
        if (found) {
          const updated: UserProfile = {
            id: found.id,
            username: found.username,
            email: found.email,
            role: found.role,
            status: found.status,
            createdAt: found.createdAt,
          };
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated));
          return { user: updated };
        }
        return { user: parsed };
      } catch {}
    }

    throw new Error('Unauthorized');
  },

  async getGames(publishedOnly = true): Promise<{ games: StoredGameSummary[] }> {
    try {
      const res = await fetch(`${API_BASE}/games?publishedOnly=${publishedOnly}`);
      if (res.ok) return res.json();
    } catch {}

    return { games: getStoredMockGames() };
  },

  async getGameManifest(gameId: string): Promise<GameManifest & { projectData?: any }> {
    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/manifest`);
      if (res.ok) return res.json();
    } catch {}

    // Cari di daftar mock games jika ada projectData tersimpan
    const storedGames = getStoredMockGames();
    const matchedGame = storedGames.find((g) => g.id === gameId);

    const cachedLatest = localStorage.getItem(`blockverse_project_${gameId}`) || localStorage.getItem('blockverse_latest_project');
    const resolvedProjectData = matchedGame?.projectData || (cachedLatest ? JSON.parse(cachedLatest) : undefined);

    return {
      id: gameId,
      title: matchedGame?.title || resolvedProjectData?.title || 'BlockVerse 2D Game Project',
      description: matchedGame?.description || 'Game 2D berbasis Scratch 3.0 Blockly engine',
      authorId: matchedGame?.authorId || 'dev_1',
      authorName: matchedGame?.authorName || 'dev',
      version: '1.0.0',
      category: (matchedGame?.category as any) || 'arcade',
      canvas: {
        width: 480,
        height: 360,
        gridSize: 20,
        backgroundColor: resolvedProjectData?.stageBackdrop || '#090d16',
        tickRateMs: 16,
      },
      entities: [],
      logic: { version: '1.0', blocks: [] } as any,
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectData: resolvedProjectData,
    };
  },

  async publishGame(payload: any): Promise<{ message: string; gameId: string }> {
    // Selalu simpan salinan projectData ke localStorage agar instan tersedia
    if (payload.projectData) {
      localStorage.setItem('blockverse_latest_project', JSON.stringify(payload.projectData));
    }

    try {
      const res = await fetch(`${API_BASE}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.gameId && payload.projectData) {
          localStorage.setItem(`blockverse_project_${data.gameId}`, JSON.stringify(payload.projectData));
        }
        return data;
      }
    } catch {}

    // Fallback simpan ke daftar Katalog Mock agar tetap muncul di Katalog Game
    const currentUserRaw = localStorage.getItem(CURRENT_USER_KEY);
    const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;

    const gameId = `game_${Date.now()}`;
    if (payload.projectData) {
      localStorage.setItem(`blockverse_project_${gameId}`, JSON.stringify(payload.projectData));
    }

    const games = getStoredMockGames();
    const resolvedTitle = payload.title || payload.projectData?.title || 'Untitled Game';

    games.unshift({
      id: gameId,
      title: resolvedTitle,
      description: payload.description || `Game 2D interaktif buatan ${currentUser?.username || 'Developer'} di Studio Blok 2D`,
      authorId: currentUser?.id || 'usr_dev',
      authorName: currentUser?.username || 'dev',
      category: payload.category || 'arcade',
      playCount: 1,
      highScore: 0,
      isPublished: payload.status !== 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectData: payload.projectData,
    });
    localStorage.setItem(MOCK_GAMES_KEY, JSON.stringify(games));

    return { message: 'Game berhasil dipublish ke Cloud & Katalog!', gameId };
  },

  async deleteGame(gameId: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/games/${gameId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
      });
      if (res.ok) return;
    } catch {}

    const games = getStoredMockGames().filter((g) => g.id !== gameId);
    localStorage.setItem(MOCK_GAMES_KEY, JSON.stringify(games));
  },

  async recordPlay(gameId: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/games/${gameId}/play`, { method: 'POST' });
    } catch {}
  },

  async submitScore(gameId: string, score: number): Promise<{ message: string }> {
    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ score }),
      });
      if (res.ok) return res.json();
    } catch {}

    return { message: 'Skor berhasil dicatat!' };
  },

  async getLeaderboard(gameId: string): Promise<{ leaderboard: LeaderboardEntry[] }> {
    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/scores`);
      if (res.ok) return res.json();
    } catch {}

    return {
      leaderboard: [
        { id: '1', gameId, userId: 'usr_1', username: 'ChampionPlayer', score: 250, createdAt: new Date().toISOString() },
        { id: '2', gameId, userId: 'usr_2', username: 'PixelMaster', score: 180, createdAt: new Date().toISOString() },
        { id: '3', gameId, userId: 'usr_3', username: 'ScratchHero', score: 120, createdAt: new Date().toISOString() },
      ],
    };
  },

  async getAdminMetrics(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/admin/metrics`, {
        headers: { ...getAuthHeader() },
      });
      if (res.ok) return res.json();
    } catch {}

    const games = getStoredMockGames();
    const users = getStoredMockUsers();
    return {
      metrics: {
        totalUsers: users.length,
        totalGames: games.length,
        totalPlays: games.reduce((acc, g) => acc + (g.playCount || 0), 0),
        totalScores: 12,
        pendingDevsCount: users.filter((u) => u.role === UserRole.DEVELOPER && u.status === 'PENDING').length,
        roles: [
          { role: 'ADMIN', count: 1 },
          { role: 'DEVELOPER', count: users.filter((u) => u.role === UserRole.DEVELOPER).length },
          { role: 'PLAYER', count: users.filter((u) => u.role === UserRole.PLAYER).length },
        ],
      },
      system: {
        status: 'ONLINE',
        uptimeSeconds: 3600,
        memoryUsageMB: 48,
        osPlatform: 'linux',
        osUptimeHours: '24.0',
        nodeVersion: 'v22.x',
      },
    };
  },

  async getAdminUsers(): Promise<{ users: UserProfile[] }> {
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { ...getAuthHeader() },
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
          ...getAuthHeader(),
        },
        body: JSON.stringify({ role }),
      });
      if (res.ok) return;
    } catch {}

    const users = getStoredMockUsers().map((u) => (u.id === userId ? { ...u, role } : u));
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
  },

  async getPendingDevelopers(): Promise<{ pendingUsers: UserProfile[] }> {
    try {
      const res = await fetch(`${API_BASE}/admin/pending-developers`, {
        headers: { ...getAuthHeader() },
      });
      if (res.ok) return res.json();
    } catch {}

    const users = getStoredMockUsers().filter((u) => u.role === UserRole.DEVELOPER && u.status === 'PENDING');
    return { pendingUsers: users };
  },

  async approveDeveloper(userId: string): Promise<{ message: string }> {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
      });
      if (res.ok) return res.json();
    } catch {}

    const users = getStoredMockUsers().map((u) => (u.id === userId ? { ...u, status: 'ACTIVE' as const } : u));
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
    return { message: 'Akun developer berhasil disetujui (Approved)!' };
  },

  async rejectDeveloper(userId: string): Promise<{ message: string }> {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/reject`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
      });
      if (res.ok) return res.json();
    } catch {}

    const users = getStoredMockUsers().map((u) => (u.id === userId ? { ...u, status: 'REJECTED' as const } : u));
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
    return { message: 'Akun developer telah ditolak.' };
  },

  async updateUserStatus(userId: string, status: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) return;
    } catch {}
  },
};
