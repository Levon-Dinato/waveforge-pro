// src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AudioEngineProvider } from './contexts/AudioEngineContext';
import { AuthProvider } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { ToastProvider } from './components/ui/Toast';
import { WindowsProvider } from './components/WindowsManager';
import { MainLayout } from './layouts/MainLayout';
import { PrivateRoute } from './components/PrivateRoute';
import './styles.css';

// Lazy loading
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const StudioPage = lazy(() => import('./pages/StudioPage').then((m) => ({ default: m.StudioPage })));
const StemsPage = lazy(() => import('./pages/StemsPage').then((m) => ({ default: m.StemsPage })));
const MasteringPage = lazy(() => import('./pages/MasteringPage').then((m) => ({ default: m.MasteringPage })));
const MusicGenPage = lazy(() => import('./pages/MusicGenPage').then((m) => ({ default: m.MusicGenPage })));
const GeneratorPage = lazy(() => import('./pages/GeneratorPage').then((m) => ({ default: m.GeneratorPage })));
const VideoPage = lazy(() => import('./pages/VideoPage').then((m) => ({ default: m.VideoPage })));
const CDJPage = lazy(() => import('./pages/CDJPage').then((m) => ({ default: m.CDJPage })));
const HelpPage = lazy(() => import('./pages/HelpPage').then((m) => ({ default: m.HelpPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const NouveautesPage = lazy(() => import('./pages/NouveautesPage').then((m) => ({ default: m.NouveautesPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const GenresPage = lazy(() => import('./pages/GenresPage').then((m) => ({ default: m.GenresPage })));
const ArtistsPage = lazy(() => import('./pages/ArtistsPage').then((m) => ({ default: m.ArtistsPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const MixerPage = lazy(() => import('./pages/MixerPage').then((m) => ({ default: m.MixerPage })));
const LivePage = lazy(() => import('./pages/LivePage').then((m) => ({ default: m.LivePage })));
const TrackPage = lazy(() => import('./pages/TrackPage').then((m) => ({ default: m.TrackPage })));
const EventsPage = lazy(() => import('./pages/EventsPage').then((m) => ({ default: m.EventsPage })));
const FeedPage = lazy(() => import('./pages/FeedPage').then((m) => ({ default: m.FeedPage })));
const ToolsPage = lazy(() => import('./pages/ToolsPage').then((m) => ({ default: m.ToolsPage })));

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
    <div style={{ width: 40, height: 40, border: '3px solid rgba(0, 217, 255, 0.2)', borderTop: '3px solid #00d9ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <div style={{ fontSize: 11, color: '#666', letterSpacing: '2px', fontFamily: 'monospace' }}>CHARGEMENT...</div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default function App() {
  return (
    <HelmetProvider>
      <ToastProvider>
        <AuthProvider>
          <PlayerProvider>
            <AudioEngineProvider>
              <BrowserRouter>
                <WindowsProvider>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      
                      {/* ✅ 1. ROUTES PUBLIQUES */}
                      <Route path="/auth" element={<AuthPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />

                      {/* ✅ 2. ROUTES PROTÉGÉES */}
                      <Route path="/mixer" element={<PrivateRoute><MixerPage /></PrivateRoute>} />

                      {/* ✅ On enveloppe MainLayout avec PrivateRoute */}
                      <Route path="/" element={
                        <PrivateRoute>
                          <MainLayout />
                        </PrivateRoute>
                      }>
                        <Route index element={<HomePage />} />
                        <Route path="feed" element={<FeedPage />} />
                        <Route path="nouveautes" element={<NouveautesPage />} />
                        <Route path="events" element={<EventsPage />} />
                        <Route path="live" element={<LivePage />} />
                        <Route path="genres" element={<GenresPage />} />
                        <Route path="artists" element={<ArtistsPage />} />
                        <Route path="tools" element={<ToolsPage />} />
                        
                        {/* ✅ AJOUT DE LA ROUTE STUDIO */}
                        <Route path="studio" element={<StudioPage />} />
                        
                        <Route path="stems" element={<StemsPage />} />
                        <Route path="mastering" element={<MasteringPage />} />
                        <Route path="musicgen" element={<MusicGenPage />} />
                        <Route path="generator" element={<GeneratorPage />} />
                        <Route path="video" element={<VideoPage />} />
                        <Route path="cdj" element={<CDJPage />} />
                        <Route path="help" element={<HelpPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="profil/:id" element={<ProfilePage />} />
                        <Route path="search" element={<SearchPage />} />
                        <Route path="track/:id" element={<TrackPage />} />
                      </Route>

                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </WindowsProvider>
              </BrowserRouter>
            </AudioEngineProvider>
          </PlayerProvider>
        </AuthProvider>
      </ToastProvider>
    </HelmetProvider>
  );
}