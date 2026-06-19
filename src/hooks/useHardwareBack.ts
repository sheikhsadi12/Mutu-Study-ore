import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Bulletproof global hook explicitly intercepting the Android back button.
 * Forces it to use React Router's back navigation, never allowing the PWA to 
 * close unless the user is on the absolute root path '/'.
 */
export function useHardwareBack() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Push a dummy state when entering a new route to ensure the history stack is never empty.
    // This allows the OS to 'pop' a state instead of explicitly closing the application.
    if (location.pathname !== '/') {
      window.history.pushState({ pwa: true }, '', window.location.href);
    }

    const handlePopState = (event: PopStateEvent) => {
      if (location.pathname !== '/') {
        // We are on a subpage and the user pressed the hardware back button.
        // Navigate to the previous page to mimic a professional app.
        navigate(-1);
      }
      // If location.pathname === '/', do nothing, allowing the default browser behavior (app closes).
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location.pathname, navigate]);
}

/**
 * Target hardware back for modals and overlays.
 */
export function useModalBack(isOpen: boolean, onBack: () => void) {
  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ isModal: true }, '');

      const handlePopState = (e: PopStateEvent) => {
        onBack();
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isOpen, onBack]);
}
