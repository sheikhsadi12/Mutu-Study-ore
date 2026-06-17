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
      className={`fixed top-0 left-0 w-screen h-screen flex flex-col items-center justify-center bg-[#050000] z-[9999] transition-opacity duration-700 ease-in-out ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      {/* Circle Emblem with golden text and pulse effect */}
      <div className="w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-[#4C0519] to-[#2a020b] border border-[#e8c3a2]/30 shadow-[0_0_30px_rgba(232,195,162,0.15)] animate-pulse">
        <span className="text-5xl font-serif text-[#e8c3a2]">M</span>
      </div>
      
      {/* Premium Typography */}
      <h1 className="mt-6 text-xl font-sans tracking-[0.3em] text-[#e8c3a2]/90 font-medium">
        MUTU STUDY
      </h1>
      
      {/* Subtitle */}
      <p className="text-xs tracking-widest text-white/40 mt-2 uppercase">
        End-to-End Anonymous
      </p>
    </div>
  );
}
