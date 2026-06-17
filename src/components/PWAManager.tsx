import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}

export function PWAManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Handle hardware back button
  useEffect(() => {
    // If we're on a child page, push a trap state so the first back button click
    // fires popstate without exiting the app
    if (location.pathname !== '/' && location.pathname !== '/login') {
       window.history.pushState({ pwaTrap: true }, '');
    }

    const handlePopState = (e: PopStateEvent) => {
      // The browser's back button was pressed.
      // If we pushed our trap state, the popstate event will fire.
      if (location.pathname !== '/' && location.pathname !== '/login') {
         // Instead of exiting, go back in React Router's history or go to root
         navigate(-1);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location.pathname, navigate]);

  // Handle PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // We can show it automatically if they are on dashboard/main
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (deferredPrompt && (location.pathname === '/' || location.pathname === '/community')) {
      const hasDismissed = localStorage.getItem('mutu_pwa_dismissed');
      if (!hasDismissed) {
        // slight delay for better UX
        const timer = setTimeout(() => setShowInstallPrompt(true), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [deferredPrompt, location.pathname]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('mutu_pwa_dismissed', 'true');
  };

  if (!showInstallPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[999] p-4 animate-in slide-in-from-bottom-5 duration-500">
      <div className="max-w-md mx-auto bg-theme-card/80 backdrop-blur-xl border border-theme-border/60 shadow-[0_10px_40px_-5px_rgba(0,0,0,0.3)] rounded-2xl p-5 relative overflow-hidden">
        {/* Glassmorphism/Mahogany highlight */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-theme-accent-start to-theme-accent-end opacity-80"></div>
        
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-theme-text/40 hover:text-theme-text transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4 pr-6">
          <div className="w-12 h-12 bg-theme-bg/50 border border-theme-border/50 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
            <Download className="w-6 h-6 text-theme-accent-end" />
          </div>
          <div className="flex-1 pt-1">
            <h3 className="font-heading font-bold tracking-tight text-base mb-1.5 text-theme-text">Install Mutu Study</h3>
            <p className="text-[13px] leading-relaxed text-theme-text/80 font-sans mb-4">
              mutu study অ্যাপটি আপনার ফোনে ইনস্টল করুন এবং সুপারফাস্ট ব্যবহার করুন!
            </p>
            <button
              onClick={handleInstallClick}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white text-sm font-bold rounded-xl shadow-lg shadow-theme-accent-start/20 hover:-translate-y-0.5 transition-transform active:scale-[0.98]"
            >
              ইনস্টল করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
