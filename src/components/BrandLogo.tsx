import React from 'react';
import { motion } from 'motion/react';

interface BrandLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  animate?: boolean;
  showText?: boolean;
  vertical?: boolean;
  textClassName?: string;
}

/**
 * Reusable premium Brand Logo Component.
 * Integrates the stylish serif 'M' inside a deep mahogany/black tactile container
 * using a warm gold-copper gradient, with support for breathing animation and text pairing.
 */
export function BrandLogo({
  size = 40,
  animate = false,
  showText = true,
  vertical = false,
  className = '',
  textClassName = '',
  ...props
}: BrandLogoProps) {
  
  // Icon styling and structure
  const iconMarkup = (
    <motion.div
      className="relative rounded-[28%] bg-gradient-to-br from-[#881337] via-[#4c0519] to-[#1c000a] flex items-center justify-center overflow-hidden border border-[#881337]/40 shadow-lg shrink-0"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        boxShadow: 'inset 0 3px 8px rgba(0, 0, 0, 0.55), inset 0 -2px 6px rgba(255, 255, 255, 0.06), 0 10px 24px rgba(0, 0, 0, 0.4)',
      }}
      animate={animate ? {
        scale: [1, 1.04, 1],
        boxShadow: [
          'inset 0 3px 8px rgba(0,0,0,0.65), inset 0 -2px 6px rgba(255,255,255,0.04), 0 10px 24px rgba(252,211,77,0.15)',
          'inset 0 3px 8px rgba(0,0,0,0.65), inset 0 -2px 6px rgba(255,255,255,0.04), 0 10px 30px rgba(252,211,77,0.3)',
          'inset 0 3px 8px rgba(0,0,0,0.65), inset 0 -2px 6px rgba(255,255,255,0.04), 0 10px 24px rgba(252,211,77,0.15)',
        ]
      } : {}}
      transition={animate ? {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      } : undefined}
    >
      {/* Precision Inner Bezel for a high-end carved craft finish */}
      <div className="absolute inset-[4%] rounded-[26%] border border-[#7c2d12]/15 pointer-events-none" />
      <div className="absolute inset-[5%] rounded-[25%] border border-[#fcd34d]/5 pointer-events-none" />
      
      {/* Subtle background glow when we animate */}
      {animate && (
        <motion.div 
          className="absolute inset-0 bg-radial from-[#ea580c]/10 to-transparent pointer-events-none"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Royal Serif Monogram 'M' in copper-gold gradient */}
      <span
        className="font-heading font-black text-transparent bg-clip-text bg-gradient-to-b from-[#fcd34d] to-[#ea580c] select-none tracking-tighter flex items-center justify-center"
        style={{
          fontSize: `${size * 0.58}px`,
          lineHeight: 1,
          fontFamily: '"Playfair Display", ui-serif, Georgia, serif',
          filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))',
          paddingBottom: `${size * 0.06}px`,
          textShadow: '0px 1px 1px rgba(0,0,0,0.2)',
        }}
      >
        M
      </span>
    </motion.div>
  );

  if (!showText) {
    return (
      <div className={`inline-block ${className}`} {...props}>
        {iconMarkup}
      </div>
    );
  }

  return (
    <div className={`flex ${vertical ? 'flex-col items-center gap-4' : 'flex-row items-center gap-3'} ${className}`} {...props}>
      {iconMarkup}
      <span 
        className={`tracking-tight font-heading font-black text-transparent bg-clip-text bg-gradient-to-r from-theme-accent-start to-theme-accent-end uppercase truncate ${textClassName}`}
        style={{
          fontSize: vertical 
            ? `${Math.max(16, size * 0.32)}px` 
            : `${Math.max(13, size * 0.40)}px`,
          lineHeight: 1.1,
        }}
      >
        MUTU STUDY
      </span>
    </div>
  );
}
