// src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AudioEngineProvider } from './contexts/AudioEngineContext';
import { AuthProvider } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { ToastProvider } from './components/ui/Toast';
import { WindowsProvider } from './components/WindowsManager';
import { MainLayout } from './layouts/MainLayout';
import { PrivateRoute } from './components/PrivateRoute';
import './styles.css';

// ============================================================
// LAZY LOADING DES PAGES
// ============================================================

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
const GenresPage = lazy(() =>
  import('./pages/GenresPage').then((m) => ({ default: m.GenresPage }))
);
const ArtistsPage = lazy(() =>
  import('./pages/ArtistsPage').then((m) => ({ default: m.ArtistsPage }))
);
const SearchPage = lazy(() =>
  import('./pages/SearchPage').then((m) => ({ default: m.SearchPage }))
);
// ✅ Import du MixerPage
const MixerPage = lazy(() =>
  import('./pages/MixerPage').then((m) => ({ default: m.MixerPage }))
);
// ✅ Import de la LivePage
const LivePage = lazy(() =>
  import('./pages/LivePage').then((m) => ({ default: m.LivePage }))
);

// ============================================================
// PAGE LOADER
// ============================================================
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

// ============================================================
// APP
// ============================================================
export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <PlayerProvider>
          <AudioEngineProvider>
            <BrowserRouter>
              <WindowsProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* ✅ Route du Mixer en PLEIN ÉCRAN (hors du MainLayout) */}
                    <Route path="/mixer" element={<PrivateRoute><MixerPage /></PrivateRoute>} />

                    {/* ✅ Toutes les autres routes gardent ton MainLayout (Sidebar, etc.) */}
                    <Route path="/" element={<MainLayout />}>
                      {/* 🌐 Public */}
                      <Route index element={<HomePage />} />
                      <Route path="auth" element={<AuthPage />} />
                      <Route path="reset-password" element={<ResetPasswordPage />} />
                      <Route path="help" element={<HelpPage />} />
                      <Route path="live" element={<LivePage />} />

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
                      <Route path="genres" element={<PrivateRoute><GenresPage /></PrivateRoute>} />
                      <Route path="artists" element={<PrivateRoute><ArtistsPage /></PrivateRoute>} />
                      <Route path="search" element={<PrivateRoute><SearchPage /></PrivateRoute>} />
                    </Route>

                    {/* ✅ Route catch-all : redirige vers l'accueil si l'URL n'existe pas */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </WindowsProvider>
            </BrowserRouter>
          </AudioEngineProvider>
        </PlayerProvider>
      </AuthProvider>
    </ToastProvider>
  );
}