// src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { HelmetProvider } from 'react-helmet-async';
import { AudioEngineProvider } from './contexts/AudioEngineContext';
import { AuthProvider } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { RadioProvider } from './contexts/RadioContext'; // ✅ NOUVEL IMPORT
import { ToastProvider } from './components/ui/Toast';
import { WindowsProvider } from './components/WindowsManager';
import { MainLayout } from './layouts/MainLayout';
import { PrivateRoute } from './components/PrivateRoute';
import { PageTransition } from './components/PageTransition';
import { PremiumGuard } from './components/PremiumGuard';
import './styles.css';

// ... (tes imports lazy restent identiques) ...
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const RadioPage = lazy(() => import('./pages/RadioPage').then((m) => ({ default: m.RadioPage })));
// ... etc ...

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
    <div style={{ width: 40, height: 40, border: '3px solid rgba(0, 217, 255, 0.2)', borderTop: '3px solid #00d9ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <div style={{ fontSize: 11, color: '#666', letterSpacing: '2px', fontFamily: 'monospace' }}>CHARGEMENT...</div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* ... Tes routes identiques ... */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/radio/:username" element={<RadioPage />} />
        {/* ... */}
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
            <RadioProvider> {/* ✅ AJOUTÉ ICI */}
              <AudioEngineProvider>
                <BrowserRouter>
                  <WindowsProvider>
                    <Suspense fallback={<PageLoader />}>
                      <AnimatedRoutes />
                    </Suspense>
                  </WindowsProvider>
                </BrowserRouter>
              </AudioEngineProvider>
            </RadioProvider>
          </PlayerProvider>
        </AuthProvider>
      </ToastProvider>
    </HelmetProvider>
  );
}