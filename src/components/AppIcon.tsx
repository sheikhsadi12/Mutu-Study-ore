import React from 'react';

interface AppIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Premium static master template of the App Icon. 
 * Designed using a warm, royal crest aesthetic with heavy tactile depth and elegant gold-copper calligraphy.
 */
export function AppIcon({ className = '', size = 96 }: AppIconProps) {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;
  const numSize = typeof size === 'number' ? size : parseInt(String(size), 10) || 96;

  return (
    <div 
      className={`relative rounded-[28%] bg-gradient-to-br from-[#881337] via-[#4c0519] to-[#1c000a] flex items-center justify-center overflow-hidden border border-[#881337]/40 ${className}`}
      style={{ 
        width: pixelSize, 
        height: pixelSize,
        boxShadow: 'inset 0 3px 8px rgba(0, 0, 0, 0.55), inset 0 -2px 6px rgba(255, 255, 255, 0.06), 0 10px 24px rgba(0, 0, 0, 0.4)'
      }}
    >
      {/* Precision Inner Bezel for high-end carved craft look */}
      <div className="absolute inset-[4%] rounded-[26%] border border-[#7c2d12]/15 pointer-events-none" />
      <div className="absolute inset-[5%] rounded-[25%] border border-[#fcd34d]/5 pointer-events-none" />
      
      {/* Royal Serif Monogram 'M' in copper-gold gradient - subdued and elegant without harsh white blazes */}
      <span 
        className="font-heading font-black text-transparent bg-clip-text bg-gradient-to-b from-[#fcd34d] to-[#ea580c] select-none tracking-tighter flex items-center justify-center"
        style={{ 
          fontSize: `${numSize * 0.58}px`,
          lineHeight: 1,
          fontFamily: '"Playfair Display", ui-serif, Georgia, serif',
          filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.5))',
          paddingBottom: `${numSize * 0.06}px`,
          textShadow: '0px 1px 1px rgba(0,0,0,0.2)'
        }}
      >
        M
      </span>
    </div>
  );
}
