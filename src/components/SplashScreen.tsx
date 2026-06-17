import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

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
              className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-theme-accent-start to-theme-accent-end rounded-[20px] sm:rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-theme-accent-start/30 relative z-10 before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-white/20"
            >
              <motion.div
                animate={{ 
                  boxShadow: [
                    "0 0 0px 0px rgba(255, 255, 255, 0.2)",
                    "0 0 20px 10px rgba(255, 255, 255, 0)",
                    "0 0 0px 0px rgba(255, 255, 255, 0.2)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-[inherit]"
              />
              <span className="font-heading font-black text-[3.5rem] sm:text-[4.5rem] leading-none tracking-tighter flex items-center justify-center pb-1">M</span>
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
