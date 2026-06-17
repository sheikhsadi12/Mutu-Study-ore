import { useEffect, useRef } from 'react';

// Global stack to keep track of active back handlers
const backHandlersStack: Array<{ id: symbol, handler: () => void }> = [];
let pendingProgrammaticBacks = 0;
let isGlobalListenerAttached = false;

const globalPopStateHandler = (e: PopStateEvent) => {
  if (pendingProgrammaticBacks > 0) {
    pendingProgrammaticBacks--;
    return;
  }

  // Only the last handler in the stack should execute
  if (backHandlersStack.length > 0) {
    e.stopImmediatePropagation();
    const top = backHandlersStack.pop();
    if (top && top.handler) {
      top.handler();
    }
  }
};

const attachGlobalListener = () => {
  if (!isGlobalListenerAttached) {
    window.addEventListener('popstate', globalPopStateHandler);
    isGlobalListenerAttached = true;
  }
};

export function useHardwareBack(isOpen: boolean, closeUi: () => void) {
  const isPopping = useRef(false);
  const closeUiRef = useRef(closeUi);

  useEffect(() => {
    closeUiRef.current = closeUi;
  }, [closeUi]);

  useEffect(() => {
    if (!isOpen) return;

    attachGlobalListener();

    const id = Symbol('hardwareBackHandler');
    const handler = () => {
      isPopping.current = true;
      if (closeUiRef.current) closeUiRef.current();
    };

    backHandlersStack.push({ id, handler });

    // Push a dummy state so the back button is trapped
    window.history.pushState({ ui_layer: 'modal_open' }, '');

    return () => {
      // Remove from stack if it's there
      const idx = backHandlersStack.findIndex((h) => h.id === id);
      if (idx !== -1) {
        backHandlersStack.splice(idx, 1);
      }
      
      // Clean up the dummy state if we're closing the UI programmatically 
      // (not via the back button itself)
      if (!isPopping.current) {
        pendingProgrammaticBacks++;
        window.history.back();
      }
      isPopping.current = false;
    };
  }, [isOpen]);
}

