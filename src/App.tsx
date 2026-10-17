// src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AudioEngineProvider } from './contexts/AudioEngineContext';
import { AuthProvider } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { ToastProvider } from './components/ui/Toast';
import { MainLayout } from './layouts/MainLayout';
import { PrivateRoute } from './components/PrivateRoute';
import './styles.css';

const HomePage = lazy(() =>
  import('./pages/HomePage').then((m) => ({ default: m.HomePage }))
);
const StudioPage = lazy(() =>
  import('./pages/StudioPage').then((m) => ({ default: m.StudioPage }))
);
const StemsPage = lazy(() =>
  import('./pages/StemsPage').then((m) => ({ default: m.StemsPage }))
);
const MasteringPage = lazy(() =>
  import('./pages/MasteringPage').then((m) => ({ default: m.MasteringPage }))
);
const MusicGenPage = lazy(() =>
  import('./pages/MusicGenPage').then((m) => ({ default: m.MusicGenPage }))
);
const GeneratorPage = lazy(() =>
  import('./pages/GeneratorPage').then((m) => ({ default: m.GeneratorPage }))
);
const VideoPage = lazy(() =>
  import('./pages/VideoPage').then((m) => ({ default: m.VideoPage }))
);
const CDJPage = lazy(() =>
  import('./pages/CDJPage').then((m) => ({ default: m.CDJPage }))
);
const HelpPage = lazy(() =>
  import('./pages/HelpPage').then((m) => ({ default: m.HelpPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const NouveautesPage = lazy(() =>
  import('./pages/NouveautesPage').then((m) => ({ default: m.NouveautesPage }))
);
const AuthPage = lazy(() =>
  import('./pages/AuthPage').then((m) => ({ default: m.AuthPage }))
);
const ResetPasswordPage = lazy(() =>
  import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
// ✅ Import page Genres
const GenresPage = lazy(() =>
  import('./pages/GenresPage').then((m) => ({ default: m.GenresPage }))
);
// ✅ Import page Artistes
const ArtistsPage = lazy(() =>
  import('./pages/ArtistsPage').then((m) => ({ default: m.ArtistsPage }))
);
// ✅ Import page Recherche
const SearchPage = lazy(() =>
  import('./pages/SearchPage').then((m) => ({ default: m.SearchPage }))
);

const PageLoader = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      flexDirection: 'column',
      gap: 16,
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        border: '3px solid rgba(0, 217, 255, 0.2)',
        borderTop: '3px solid #00d9ff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
    <div
      style={{
        fontSize: 11,
        color: '#666',
        letterSpacing: '2px',
        fontFamily: 'monospace',
      }}
    >
      CHARGEMENT...
    </div>
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <PlayerProvider>
          <AudioEngineProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<MainLayout />}>
                    {/* 🌐 Public */}
                    <Route index element={<HomePage />} />
                    <Route path="auth" element={<AuthPage />} />
                    <Route path="reset-password" element={<ResetPasswordPage />} />
                    <Route path="help" element={<HelpPage />} />

                    {/* 🔒 Protégées */}
                    <Route path="studio" element={<PrivateRoute><StudioPage /></PrivateRoute>} />
                    <Route path="stems" element={<PrivateRoute><StemsPage /></PrivateRoute>} />
                    <Route path="mastering" element={<PrivateRoute><MasteringPage /></PrivateRoute>} />
                    <Route path="musicgen" element={<PrivateRoute><MusicGenPage /></PrivateRoute>} />
                    <Route path="generator" element={<PrivateRoute><GeneratorPage /></PrivateRoute>} />
                    <Route path="video" element={<PrivateRoute><VideoPage /></PrivateRoute>} />
                    <Route path="cdj" element={<PrivateRoute><CDJPage /></PrivateRoute>} />
                    <Route path="settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
                    <Route path="nouveautes" element={<PrivateRoute><NouveautesPage /></PrivateRoute>} />
                    <Route path="profil/:id" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                    
                    {/* ✅ Nouvelles routes */}
                    <Route path="genres" element={<PrivateRoute><GenresPage /></PrivateRoute>} />
                    <Route path="artists" element={<PrivateRoute><ArtistsPage /></PrivateRoute>} />
                    <Route path="search" element={<PrivateRoute><SearchPage /></PrivateRoute>} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AudioEngineProvider>
        </PlayerProvider>
      </AuthProvider>
    </ToastProvider>
  );
}