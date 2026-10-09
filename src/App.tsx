// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AudioEngineProvider } from './contexts/AudioEngineContext';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './pages/HomePage';
import { StudioPage } from './pages/StudioPage';
import { StemsPage } from './pages/StemsPage';
import { MasteringPage } from './pages/MasteringPage';
import { RemixPage } from './pages/RemixPage';
import { GeneratorPage } from './pages/GeneratorPage';
import { SettingsPage } from './pages/SettingsPage';
import './styles.css';

export default function App() {
  return (
    <AudioEngineProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="studio" element={<StudioPage />} />
            <Route path="stems" element={<StemsPage />} />
            <Route path="mastering" element={<MasteringPage />} />
            <Route path="remix" element={<RemixPage />} />
            <Route path="generator" element={<GeneratorPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AudioEngineProvider>
  );
}