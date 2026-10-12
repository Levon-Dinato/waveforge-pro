// src/hooks/usePWAInstall.ts
import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);

  useEffect(() => {
    // Déjà installé (mode standalone) ?
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Détection OS
    const ua = window.navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(ua);
    const android = /android/.test(ua);
    setIsIOS(iOS);
    setIsAndroid(android);

    // Écoute l'événement Chrome/Edge
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setHasNativePrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Détecte l'installation
    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setHasNativePrompt(false);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'ios' | 'manual'> => {
    // iOS → modale manuelle
    if (isIOS) return 'ios';

    // Prompt natif disponible
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
        setHasNativePrompt(false);
        return outcome;
      } catch {
        return 'dismissed';
      }
    }

    // Fallback : instructions manuelles
    return 'manual';
  }, [deferredPrompt, isIOS]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  // ✅ Affiche le bouton TOUJOURS si non installé (fallback pour Chrome Mobile, Safari, etc.)
  const shouldShowInstall =
    !isInstalled &&
    !isDismissed;

  return {
    shouldShowInstall,
    isInstalled,
    isIOS,
    isAndroid,
    hasNativePrompt,
    promptInstall,
    dismiss,
  };
}