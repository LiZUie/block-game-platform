import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '@blockgame/shared';
import { api } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (usernameOrEmail: string, pass: string) => Promise<UserProfile>;
  register: (username: string, email: string, pass: string, role: UserRole) => Promise<UserProfile>;
  logout: () => void;
  switchQuickDemo: (role: UserRole) => Promise<UserProfile>;
  refreshUser: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('blockgame_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch {
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (usernameOrEmail: string, pass: string): Promise<UserProfile> => {
    const res = await api.login(usernameOrEmail, pass);
    localStorage.setItem('blockgame_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (username: string, email: string, pass: string, role: UserRole): Promise<UserProfile> => {
    const res = await api.register(username, email, pass, role);
    localStorage.setItem('blockgame_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('blockgame_token');
    setToken(null);
    setUser(null);
  };

  const switchQuickDemo = async (role: UserRole): Promise<UserProfile> => {
    let email = 'dev@blockgame.cloud';
    let pass = 'dev123';

    if (role === UserRole.ADMIN) {
      email = 'admin@blockgame.cloud';
      pass = 'admin123';
    } else if (role === UserRole.PLAYER) {
      email = 'player@blockgame.cloud';
      pass = 'player123';
    }

    const res = await api.login(email, pass);
    localStorage.setItem('blockgame_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const refreshUser = async (): Promise<UserProfile | null> => {
    try {
      const res = await api.getMe();
      setUser(res.user);
      return res.user;
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, switchQuickDemo, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
