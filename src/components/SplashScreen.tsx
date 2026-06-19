import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppIcon } from './AppIcon';

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show splash screen for 2.5 seconds then fade out
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 800); // Allow time for exit animation
    }, 2500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed top-0 left-0 w-screen h-screen flex items-center justify-center bg-theme-bg z-[9999]"
        >
          <div className="relative flex flex-col items-center justify-center w-full">
            {/* App Logo - Perfectly geometrically centered in viewport */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut", type: "spring", bounce: 0.4 }}
              className="relative z-10"
            >
              <AppIcon size={96} className="sm:w-24 sm:h-24 w-20 h-20" />
            </motion.div>
            
            {/* Texts - Absolute positioned below so they don't affect the exact centering of the logo box */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="absolute top-full pt-8 flex flex-col items-center w-full"
            >
              {/* App Title - Matching Header Typography exact styles */}
              <h1 className="text-2xl sm:text-3xl tracking-tight font-heading font-black text-theme-accent-start">
                MUTU STUDY
              </h1>
              
              {/* Subtitle */}
              <p className="text-[11px] sm:text-xs font-sans text-theme-text/50 mt-1.5 font-medium uppercase tracking-[0.1em]">
                End-to-End Anonymous
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
