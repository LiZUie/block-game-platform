import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserRole, UserProfile } from '@blockgame/shared';
import { Navbar } from './components/Navbar';
import { LoginView } from './views/LoginView';
import { CatalogView } from './views/CatalogView';
import { PlayerView } from './views/PlayerView';
import { StudioView } from './views/StudioView';
import { AdminView } from './views/AdminView';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'catalog' | 'studio' | 'admin' | 'play'>('catalog');
  const [activeGameId, setActiveGameId] = useState<string>('game_adventure_dungeon');

  const handleLoginSuccess = (loggedInUser: UserProfile) => {
    // Arahkan otomatis ke halaman sesuai peran:
    // Admin -> Cloud Admin Dashboard
    // Developer -> Developer Studio 2D
    // Player -> Katalog Game Arcade
    if (loggedInUser.role === UserRole.ADMIN) {
      setCurrentView('admin');
    } else if (loggedInUser.role === UserRole.DEVELOPER) {
      setCurrentView('studio');
    } else {
      setCurrentView('catalog');
    }
  };

  const handlePlayGame = (gameId: string) => {
    setActiveGameId(gameId);
    setCurrentView('play');
  };

  const handleCreateNewGame = () => {
    setCurrentView('studio');
  };

  const handleGamePublished = (gameId: string) => {
    setActiveGameId(gameId);
    setCurrentView('play');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 font-mono text-xs">
        Memeriksa sesi login cloud...
      </div>
    );
  }

  // Jika belum login, tampilkan Layar Login Gerbang Awal
  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
      />

      <main className="flex-1 pb-16">
        {currentView === 'catalog' && (
          <CatalogView
            onPlayGame={handlePlayGame}
            onCreateNewGame={handleCreateNewGame}
          />
        )}

        {currentView === 'play' && (
          <PlayerView
            gameId={activeGameId}
            onBackToCatalog={() => setCurrentView('catalog')}
          />
        )}

        {currentView === 'studio' && (
          <StudioView
            onGamePublished={handleGamePublished}
          />
        )}

        {currentView === 'admin' && (
          <AdminView />
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>BlockVerse 2D Cloud</strong> • Ekosistem Service Cloud Game UGC Berbasis Block Programming
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>1. Cloud Service</span>
            <span>→</span>
            <span>2. Block Studio</span>
            <span>→</span>
            <span>3. Player Client</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
