import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed / running standalone
    const isApp =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isApp);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Show iOS or general guide
      setShowIOSGuide(true);
    }
  };

  if (isStandalone || dismissed) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white px-4 py-2 text-xs flex items-center justify-between border-b border-zinc-700/60 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-[10px]">
            V
          </div>
          <p className="font-medium text-zinc-200">
            Install Victor as your personal assistant on your phone
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-[11px] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss install banner"
            className="p-1 rounded text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-2xl text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-cyan-500" />
                <h3 className="font-semibold text-sm">Install Victor on Mobile</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
              Victor is a full Progressive Web App. You can install him directly without an app store:
            </p>

            <div className="space-y-2.5 text-xs text-zinc-700 dark:text-zinc-300">
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
                <strong className="block text-zinc-900 dark:text-zinc-100 mb-1">On iOS (iPhone/iPad Safari):</strong>
                Tap the <span className="font-semibold text-cyan-600 dark:text-cyan-400">Share button</span> (square with arrow up), scroll down and select <span className="font-semibold text-cyan-600 dark:text-cyan-400">"Add to Home Screen"</span>.
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
                <strong className="block text-zinc-900 dark:text-zinc-100 mb-1">On Android (Chrome):</strong>
                Tap the <span className="font-semibold text-cyan-600 dark:text-cyan-400">three dots menu</span> (top right) and select <span className="font-semibold text-cyan-600 dark:text-cyan-400">"Install app"</span> or "Add to Home screen".
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
