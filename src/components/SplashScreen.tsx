import React, { useEffect, useState } from 'react';

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Show splash screen for 2 seconds then trigger natural fade out
    const timer = setTimeout(() => {
      setFading(true);
      // Wait for the CSS transition duration to complete before unmounting
      setTimeout(onFinish, 700);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div 
      className={`fixed top-0 left-0 w-screen h-screen flex flex-col items-center justify-center bg-theme-bg z-[9999] transition-opacity duration-700 ease-in-out ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      {/* Circle Emblem with golden text and pulse effect */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center bg-gradient-to-br from-theme-accent-start to-theme-accent-end border border-theme-border/30 dark:shadow-[0_0_30px_rgba(232,195,162,0.05)] shadow-xl animate-pulse mb-6">
        <span className="text-6xl sm:text-7xl font-heading text-white">M</span>
      </div>
      
      {/* Premium Typography */}
      <h1 className="text-2xl sm:text-3xl font-heading tracking-[0.2em] sm:tracking-[0.3em] text-theme-text font-bold uppercase">
        Mutu Study
      </h1>
      
      {/* Subtitle */}
      <p className="text-[10px] sm:text-xs tracking-[0.3em] text-theme-text/50 mt-3 sm:mt-4 font-sans uppercase font-medium">
        End-to-End Anonymous
      </p>
    </div>
  );
}
