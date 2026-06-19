import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrandLogo } from './BrandLogo';

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
          <div className="relative flex flex-col items-center justify-center w-full px-4">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut", type: "spring", bounce: 0.4 }}
              className="flex flex-col items-center"
            >
              <BrandLogo 
                size={96} 
                animate={true} 
                vertical={true} 
                showText={true} 
                textClassName="text-2xl sm:text-3xl font-heading font-black mt-2"
              />
              
              {/* Subtitle */}
              <p className="text-[11px] sm:text-xs font-sans text-theme-text/50 mt-2.5 font-medium uppercase tracking-[0.1em] text-center">
                End-to-End Anonymous
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
