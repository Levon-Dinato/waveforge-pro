// src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { HelmetProvider } from 'react-helmet-async';
import { AudioEngineProvider } from './contexts/AudioEngineContext';
import { AuthProvider } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { ToastProvider } from './components/ui/Toast';
import { WindowsProvider } from './components/WindowsManager';
import { MainLayout } from './layouts/MainLayout';
import { PrivateRoute } from './components/PrivateRoute';
import { PageTransition } from './components/PageTransition';
import './styles.css';

// Lazy loading de toutes les pages
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
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage }))); 

const LevonDinatoPage = lazy(() => import('./pages/LevonDinatoPage').then((m) => ({ default: m.LevonDinatoPage })));
const PremiumPage = lazy(() => import('./pages/PremiumPage').then((m) => ({ default: m.PremiumPage })));

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
    <div style={{ width: 40, height: 40, border: '3px solid rgba(0, 217, 255, 0.2)', borderTop: '3px solid #00d9ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <div style={{ fontSize: 11, color: '#666', letterSpacing: '2px', fontFamily: 'monospace' }}>CHARGEMENT...</div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        
        {/* ✅ PAGES PLEIN ÉCRAN : ON NE MET PAS DE PAGETRANSITION (Pour ne pas casser la navbar fixe et les ancres) */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/mixer" element={<PrivateRoute><MixerPage /></PrivateRoute>} />
        <Route path="/levon-dinato" element={<LevonDinatoPage />} />
        <Route path="/premium/:username" element={<PremiumPage />} />

        {/* ROUTES AVEC LE LAYOUT PRINCIPAL (Dashboard) : ON MET LA TRANSITION */}
        <Route path="/" element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }>
          <Route index element={<PageTransition><HomePage /></PageTransition>} />
          <Route path="feed" element={<PageTransition><FeedPage /></PageTransition>} />
          <Route path="nouveautes" element={<PageTransition><NouveautesPage /></PageTransition>} />
          <Route path="events" element={<PageTransition><EventsPage /></PageTransition>} />
          <Route path="live" element={<PageTransition><LivePage /></PageTransition>} />
          <Route path="genres" element={<PageTransition><GenresPage /></PageTransition>} />
          <Route path="artists" element={<PageTransition><ArtistsPage /></PageTransition>} />
          <Route path="tools" element={<PageTransition><ToolsPage /></PageTransition>} />
          <Route path="studio" element={<PageTransition><StudioPage /></PageTransition>} />
          <Route path="stems" element={<PageTransition><StemsPage /></PageTransition>} />
          <Route path="mastering" element={<PageTransition><MasteringPage /></PageTransition>} />
          <Route path="musicgen" element={<PageTransition><MusicGenPage /></PageTransition>} />
          <Route path="generator" element={<PageTransition><GeneratorPage /></PageTransition>} />
          <Route path="video" element={<PageTransition><VideoPage /></PageTransition>} />
          <Route path="cdj" element={<PageTransition><CDJPage /></PageTransition>} />
          <Route path="help" element={<PageTransition><HelpPage /></PageTransition>} />
          <Route path="settings" element={<PageTransition><SettingsPage /></PageTransition>} />
          <Route path="profil/:id" element={<PageTransition><ProfilePage /></PageTransition>} />
          <Route path="search" element={<PageTransition><SearchPage /></PageTransition>} />
          <Route path="track/:id" element={<PageTransition><TrackPage /></PageTransition>} />
          <Route path="admin" element={<PageTransition><AdminPage /></PageTransition>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

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
                    <AppRoutes />
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