'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

// BeforeInstallPromptEvent is not in the standard TypeScript lib
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already running in standalone (installed) mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Don't show if user previously dismissed
    if (localStorage.getItem('install_prompt_dismissed') === '1') {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  if (!visible || !deferredPrompt) {
    return null;
  }

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('install_prompt_dismissed', '1');
    setVisible(false);
  };

  return (
    <div
      data-testid="install-prompt-banner"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 bg-background border-t border-border px-4 py-3 shadow-lg"
    >
      <p className="text-sm font-medium flex-1">
        Install Fueille for a better experience
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          data-testid="install-prompt-btn"
          size="sm"
          onClick={handleInstall}
        >
          Install
        </Button>
        <button
          data-testid="install-prompt-dismiss"
          aria-label="Dismiss install prompt"
          onClick={handleDismiss}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
