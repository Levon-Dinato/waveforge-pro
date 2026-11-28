// src/App.tsx
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { HelmetProvider } from 'react-helmet-async';
import { PremiumAudioLayout } from './components/PremiumAudioLayout';
import { AuthProvider } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { RadioProvider } from './contexts/RadioContext';
import { ToastProvider } from './components/ui/Toast';
import { WindowsProvider } from './components/WindowsManager';
import { MainLayout } from './layouts/MainLayout';
import { PrivateRoute } from './components/PrivateRoute';
import { PageTransition } from './components/PageTransition';
import { PremiumGuard } from './components/PremiumGuard';
import { PlayerPage } from './pages/PlayerPage';

// ✅ NOUVELLE ARCHITECTURE RADIO
import { RadioLayout } from './layouts/RadioLayout';
import { RadioHomePage } from './pages/radio/RadioHomePage';
import { RadioTopPage } from './pages/radio/RadioTopPage';
import { RadioReleasesPage } from './pages/radio/RadioReleasesPage';
import { RadioProgramPage } from './pages/radio/RadioProgramPage';

// ✅ ARCHITECTURE PAGE ARTISTE (PREMIUM)
import { PremiumLayout } from './layouts/PremiumLayout';
import { PremiumHomePage } from './pages/premium/PremiumHomePage';
import { PremiumBioPage } from './pages/premium/PremiumBioPage';
import { PremiumAgendaPage } from './pages/premium/PremiumAgendaPage';
import { PremiumReferencesPage } from './pages/premium/PremiumReferencesPage';
import { PremiumGalleryPage } from './pages/premium/PremiumGalleryPage';
import { PremiumReleasesPage } from './pages/premium/PremiumReleasesPage';

import './styles.css';

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
const RadioManagerPage = lazy(() => import('./pages/RadioManagerPage').then((m) => ({ default: m.RadioManagerPage })));
const NouveautesPage = lazy(() => import('./pages/NouveautesPage').then((m) => ({ default: m.NouveautesPage })));
const TvPage = lazy(() => import('./pages/TvPage').then((m) => ({ default: m.TvPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const AuthCallback = lazy(() => import('./pages/AuthCallback').then((m) => ({ default: m.AuthCallback })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const GenresPage = lazy(() => import('./pages/GenresPage').then((m) => ({ default: m.GenresPage })));
const ArtistsPage = lazy(() => import('./pages/ArtistsPage').then((m) => ({ default: m.ArtistsPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const LivePage = lazy(() => import('./pages/LivePage').then((m) => ({ default: m.LivePage })));
const TrackPage = lazy(() => import('./pages/TrackPage').then((m) => ({ default: m.TrackPage })));
const EventsPage = lazy(() => import('./pages/EventsPage').then((m) => ({ default: m.EventsPage })));
const FeedPage = lazy(() => import('./pages/FeedPage').then((m) => ({ default: m.FeedPage })));
const SortieRadioPage = lazy(() => import('./pages/SortieRadioPage').then((m) => ({ default: m.SortieRadioPage })));
const ToolsPage = lazy(() => import('./pages/ToolsPage').then((m) => ({ default: m.ToolsPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage }))); 
const LevonDinatoPage = lazy(() => import('./pages/LevonDinatoPage').then((m) => ({ default: m.LevonDinatoPage })));
const PremiumLandingPage = lazy(() => import('./pages/PremiumLandingPage').then((m) => ({ default: m.PremiumLandingPage })));
const ElektraqVideosPage = lazy(() => import('./pages/ElektraqVideosPage').then((m) => ({ default: m.ElektraqVideosPage })));
const SmartLinkPage = lazy(() => import('./pages/SmartLinkPage').then((m) => ({ default: m.SmartLinkPage })));
const MyPlaylistsPage = lazy(() => import('./pages/MyPlaylistsPage').then((m) => ({ default: m.MyPlaylistsPage })));
const DiscoverPage = lazy(() => import('./pages/DiscoverPage').then((m) => ({ default: m.DiscoverPage })));
const ChartsPage = lazy(() => import('./pages/ChartsPage').then((m) => ({ default: m.ChartsPage })));
const MentionsLegalesPage = lazy(() => import('./pages/MentionsLegalesPage').then((m) => ({ default: m.MentionsLegalesPage })));
const CGUPage = lazy(() => import('./pages/CGUPage').then((m) => ({ default: m.CGUPage })));
const ConfidentialitePage = lazy(() => import('./pages/ConfidentialitePage').then((m) => ({ default: m.ConfidentialitePage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })));

const RadiosPage = lazy(() => import('./pages/RadioListPage').then((m) => ({ default: m.RadioListPage })));

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
    <div style={{ width: 40, height: 40, border: '3px solid rgba(255, 255, 255, 0.2)', borderTop: '3px solid #ffffff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <div style={{ fontSize: 11, color: '#666', letterSpacing: '2px', fontFamily: 'monospace' }}>CHARGEMENT...</div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function AnimatedRoutes() {
  const location = useLocation();

  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/levon-dinato" element={<LevonDinatoPage />} />
        <Route path="/premium" element={<PremiumLandingPage />} />
        <Route path="/premium/:username" element={<PremiumLayout />}>
          <Route index element={<PremiumHomePage />} />
          <Route path="bio" element={<PremiumBioPage />} />
          <Route path="dates" element={<PremiumAgendaPage />} />
          <Route path="references" element={<PremiumReferencesPage />} />
          <Route path="galerie" element={<PremiumGalleryPage />} />
          <Route path="musique" element={<PremiumReleasesPage />} />
        </Route>
        <Route path="/link/:slug" element={<SmartLinkPage />} />
        
        <Route path="/player/:username" element={<PlayerPage />} />
        <Route path="/radio/:username" element={<RadioLayout />}>
          <Route index element={<RadioHomePage />} />
          <Route path="top" element={<RadioTopPage />} />
          <Route path="nouveautes" element={<RadioReleasesPage />} />
          <Route path="programme" element={<RadioProgramPage />} />
        </Route>

        <Route path="/tv" element={<TvPage />} />

        <Route path="/" element={<MainLayout />}>
          
          <Route index element={<PageTransition><HomePage /></PageTransition>} />
          <Route path="feed" element={<PageTransition><FeedPage /></PageTransition>} />
          <Route path="sortie-radio" element={<PageTransition><SortieRadioPage /></PageTransition>} />
          <Route path="nouveautes" element={<PageTransition><NouveautesPage /></PageTransition>} />
          <Route path="discover" element={<PageTransition><DiscoverPage /></PageTransition>} />
          <Route path="charts" element={<PageTransition><ChartsPage /></PageTransition>} />
          <Route path="events" element={<PageTransition><EventsPage /></PageTransition>} />
          <Route path="live" element={<PageTransition><LivePage /></PageTransition>} />
          <Route path="genres" element={<PageTransition><GenresPage /></PageTransition>} />
          <Route path="artists" element={<PageTransition><ArtistsPage /></PageTransition>} />
          <Route path="help" element={<PageTransition><HelpPage /></PageTransition>} />
          <Route path="mentions-legales" element={<PageTransition><MentionsLegalesPage /></PageTransition>} />
          <Route path="cgu" element={<PageTransition><CGUPage /></PageTransition>} />
          <Route path="confidentialite" element={<PageTransition><ConfidentialitePage /></PageTransition>} />
          <Route path="contact" element={<PageTransition><ContactPage /></PageTransition>} />
          <Route path="upload" element={<Navigate to="/settings" replace />} />
          <Route path="profil/:id" element={<PageTransition><ProfilePage /></PageTransition>} />
          <Route path="search" element={<PageTransition><SearchPage /></PageTransition>} />
          <Route path="track/:id" element={<PageTransition><TrackPage /></PageTransition>} />
          <Route path="mes-playlists" element={<PageTransition><MyPlaylistsPage /></PageTransition>} />
          
          <Route path="radios" element={<PageTransition><RadiosPage /></PageTransition>} />

          <Route path="tools" element={<PageTransition><PremiumGuard><ToolsPage /></PremiumGuard></PageTransition>} />
          <Route path="radio-manager" element={<PageTransition><PremiumGuard><RadioManagerPage /></PremiumGuard></PageTransition>} />
          <Route path="settings" element={<PageTransition><PremiumGuard><SettingsPage /></PremiumGuard></PageTransition>} />
          <Route path="ia-videos" element={<PageTransition><PremiumGuard><ElektraqVideosPage /></PremiumGuard></PageTransition>} />

          {/* ✅ Outils audio (Tone.js chargé en lazy uniquement ici) */}
          <Route element={<PremiumAudioLayout />}>
            <Route path="studio" element={<PageTransition><PremiumGuard><StudioPage /></PremiumGuard></PageTransition>} />
            <Route path="stems" element={<PageTransition><PremiumGuard><StemsPage /></PremiumGuard></PageTransition>} />
            <Route path="musicgen" element={<PageTransition><PremiumGuard><MusicGenPage /></PremiumGuard></PageTransition>} />
            <Route path="generator" element={<PageTransition><PremiumGuard><GeneratorPage /></PremiumGuard></PageTransition>} />
            <Route path="video" element={<PageTransition><PremiumGuard><VideoPage /></PremiumGuard></PageTransition>} />
            <Route path="cdj" element={<PageTransition><PremiumGuard><CDJPage /></PremiumGuard></PageTransition>} />
            <Route path="mastering" element={<PageTransition><PremiumGuard><MasteringPage /></PremiumGuard></PageTransition>} />
          </Route>

          <Route path="admin" element={<PrivateRoute><PageTransition><AdminPage /></PageTransition></PrivateRoute>} />
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
            <RadioProvider>
              <BrowserRouter>
                <WindowsProvider>
                  
                  {/* ✅ J'AI SUPPRIMÉ <CustomCursor /> ET <AmbientBackground /> ICI */}

                  <Suspense fallback={<PageLoader />}>
                    <AnimatedRoutes />
                  </Suspense>
                </WindowsProvider>
              </BrowserRouter>
            </RadioProvider>
          </PlayerProvider>
        </AuthProvider>
      </ToastProvider>
    </HelmetProvider>
  );
}