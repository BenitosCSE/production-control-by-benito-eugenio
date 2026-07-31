import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share } from 'lucide-react';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Check if already running in standalone mode (PWA installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Capture Chrome/Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      // Fallback message if prompt is not ready yet
      alert('Щоб встановити додаток, скористайтесь меню браузера: "Додати на початковий екран" або "Встановити додаток".');
    }
  };

  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Top / Floating PWA Install Bar */}
      <div className="bg-gradient-to-r from-[#ff6b00]/20 via-[#111111] to-[#ff6b00]/20 border-b border-[#ff6b00]/40 px-3 py-2 text-xs flex items-center justify-between text-white shadow-lg relative z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#ff6b00] flex items-center justify-center font-bold text-white shadow-md flex-shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold flex items-center gap-1.5 text-white">
              Встановити додаток "Швейний Облік"
              <span className="px-1.5 py-0.5 rounded bg-[#ff6b00]/30 text-[#ff6b00] text-[9px] font-extrabold uppercase">PWA</span>
            </div>
            <div className="text-[10px] text-[#aaaaaa]">
              Працюватиме швидше, автономно та як окрема програма на смартфоні чи ПК
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-[#ff6b00] hover:bg-[#ff8533] text-white font-bold rounded-lg shadow-md flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Download className="w-3.5 h-3.5" />
            Встановити
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-[#aaaaaa] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Сховати"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Safari Instructions Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-5 border-[#ff6b00]/50 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                <Share className="w-4 h-4 text-[#ff6b00]" />
                Інструкція для iOS (iPhone / iPad)
              </h3>
              <button
                onClick={() => setShowIosGuide(false)}
                className="text-[#aaaaaa] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-white">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#ff6b00] text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">1</span>
                <span>Натисніть кнопку <strong>"Поділитися" (Share)</strong> внизу екрана браузера Safari.</span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#ff6b00] text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">2</span>
                <span>Прокрутіть меню вниз і виберіть пункт <strong>"На початковий екран" (Add to Home Screen)</strong>.</span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#ff6b00] text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">3</span>
                <span>Підтвердіть додавання кнопкою <strong>"Додати"</strong> в правому верхньому кутку.</span>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2 bg-[#ff6b00] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />Зрозуміло
            </button>
          </div>
        </div>
      )}
    </>
  );
};
