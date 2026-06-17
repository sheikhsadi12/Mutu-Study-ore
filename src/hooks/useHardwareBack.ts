import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const backHandlersStack: Array<() => void> = [];
let programmaticBacks = 0;

export function useHardwareBack(isOpen: boolean, closeUi: () => void) {
  const closeUiRef = useRef(closeUi);

  useEffect(() => {
    closeUiRef.current = closeUi;
  }, [closeUi]);

  useEffect(() => {
    if (!isOpen) return;

    const modalId = Date.now() + Math.random();
    window.history.pushState({ isAppHistory: true, modal: true, modalId }, '');
    
    const handler = () => {
      if (closeUiRef.current) closeUiRef.current();
    };

    backHandlersStack.push(handler);

    return () => {
      const idx = backHandlersStack.indexOf(handler);
      if (idx !== -1) {
        backHandlersStack.splice(idx, 1);
        setTimeout(() => {
          // Check if the current state is the EXACT modal state we pushed
          if (window.history.state?.modalId === modalId) {
             programmaticBacks++;
             window.history.back();
          }
        }, 0);
      }
    };
  }, [isOpen]);
}

// Global layout hook to trap hardware back button
export function useAndroidBackButton() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Forcefully push a state for the route to ensure history length > 1
    window.history.pushState({ isAppHistory: true, path: location.pathname }, '');

    const handlePopState = (e: PopStateEvent) => {
      if (programmaticBacks > 0) {
        programmaticBacks--;
        return;
      }

      if (backHandlersStack.length > 0) {
        // If a modal/overlay is open, close the top-most one
        const closeTopModal = backHandlersStack.pop();
        if (closeTopModal) closeTopModal();
        
        // Prevent actual backward navigation by pushing the state back
        window.history.pushState({ isAppHistory: true, path: location.pathname }, '');
        return;
      }

      // If no modals are open
      if (location.pathname !== '/') {
        // Use React Router to safely go backwards within the app
        navigate(-1);
      } else {
        // We are at the root (/) and the user pressed back.
        // Force the app to stay alive by repushing a state
        window.history.pushState({ isAppHistory: true, path: location.pathname }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location.pathname, navigate]);
}
