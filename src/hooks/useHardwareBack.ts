import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Global stack for modal callbacks. This ensures only the top-most modal
// processes the physical back button press.
const modalCallbacks: (() => void)[] = [];

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
      // 1. Process modals first: if any modal is open, only close the TOP-MOST modal.
      if (modalCallbacks.length > 0) {
        const topCallback = modalCallbacks.pop();
        if (topCallback) {
          topCallback();
        }
        return; // Important: do not navigate back, we just closed a modal
      }

      // 2. If no modals are open, handle normal router navigation.
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
 * Safely registers the modal in a global stack so `popstate` events process them one at a time.
 */
export function useModalBack(isOpen: boolean, onBack: () => void) {
  // Use a ref to store the latest callback without re-running the effect
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!isOpen) return;

    // Push state so the OS has a history frame to pop
    window.history.pushState({ isModal: true }, '');

    // Add this modal's callback to the TOP of the global stack
    const callback = () => {
      onBackRef.current();
    };
    modalCallbacks.push(callback);

    // Notice we DO NOT add a `popstate` event listener here.
    // We let the global listener in `useHardwareBack` handle `popstate` and call this callback.

    return () => {
      // Remove this callback from the stack when the modal unmounts or closes
      const index = modalCallbacks.indexOf(callback);
      if (index > -1) {
        modalCallbacks.splice(index, 1);
      }
    };
  }, [isOpen]);
}
