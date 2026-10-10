// src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AudioEngineProvider } from './contexts/AudioEngineContext';
import { MainLayout } from './layouts/MainLayout';
import './styles.css';

// ============================================================
// ✅ LAZY LOADING : chaque page devient un chunk séparé
// Chargé uniquement quand l'utilisateur navigue dessus
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
const HelpPage = lazy(() =>
  import('./pages/HelpPage').then((m) => ({ default: m.HelpPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

// ============================================================
// ✅ Loader visuel affiché pendant le chargement d'une page
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
// ✅ App avec React Router + Suspense pour le lazy loading
// ============================================================
export default function App() {
  return (
    <AudioEngineProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="studio" element={<StudioPage />} />
              <Route path="stems" element={<StemsPage />} />
              <Route path="mastering" element={<MasteringPage />} />
              <Route path="musicgen" element={<MusicGenPage />} />
              <Route path="generator" element={<GeneratorPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AudioEngineProvider>
  );
}