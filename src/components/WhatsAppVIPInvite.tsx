import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
);

const WA_LINK = "https://chat.whatsapp.com/GkimeIpr4kLErmnrX6DXOV?s=cl&p=a&ilr=1";

export function WhatsAppBanner() {
  return (
    <div className="bg-gradient-to-br from-[#2d1136] via-[#1a0524] to-[#11011a] backdrop-blur-md border border-white/10 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_0_20px_rgba(255,255,255,0.05)] relative overflow-hidden group w-full">
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-white opacity-[0.02] rounded-full blur-2xl pointer-events-none group-hover:opacity-[0.05] transition-opacity duration-500"></div>
      
      <div className="flex items-center gap-3 relative z-10">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
          <WhatsAppIcon className="w-6 h-6 text-[#f8f3e6] drop-shadow-[0_0_8px_rgba(248,243,230,0.4)]" />
        </div>
        <div>
          <h3 className="text-[#f8f3e6] font-bold text-base md:text-lg tracking-wide">
            👑 𝐀𝐥𝐢𝐦 𝟐𝟎𝟐𝟔 | 𝐋𝐚𝐬𝐭 𝐍𝐢𝐠𝐡𝐭 𝐄𝐥𝐢𝐭𝐞 𝐒𝐮𝐠𝐠𝐞𝐬𝐭𝐢𝐨𝐧
          </h3>
          <p className="text-white/60 text-xs md:text-sm mt-0.5">
            এক্সক্লুসিভ সাজেশন ও লাইভ আপডেট পেতে যুক্ত হোন।
          </p>
        </div>
      </div>
      
      <a 
        href={WA_LINK} 
        target="_blank" 
        rel="noopener noreferrer"
        className="w-full md:w-auto bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-[#f8f3e6] font-bold py-2 md:py-2.5 px-6 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.2)] flex justify-center items-center gap-2 relative z-10"
      >
        <span>WhatsApp-এ যুক্ত হন</span>
      </a>
    </div>
  );
}

export function WhatsAppSmartPopup() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('wa_popup_dismissed');
    if (!isDismissed) {
      // Show popup after a small delay to make it feel natural
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('wa_popup_dismissed', 'true');
    setIsVisible(false);
  };

  const handleJoin = () => {
    localStorage.setItem('wa_popup_dismissed', 'true');
    setIsVisible(false);
    window.open(WA_LINK, '_blank', 'noopener,noreferrer');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div 
        className="bg-gradient-to-br from-[#2a080c] via-[#1a0508] to-[#110103] border border-[#d4af37]/30 shadow-[0_0_30px_rgba(212,175,55,0.15)] rounded-2xl p-6 md:p-8 w-full max-w-sm relative overflow-hidden flex flex-col items-center text-center animate-in zoom-in-95 duration-500"
      >
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-[#d4af37] opacity-5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-[#25D366] opacity-[0.03] rounded-full blur-3xl pointer-events-none"></div>
        
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-[#25D366]/10 flex items-center justify-center mb-5 border border-[#25D366]/20 relative">
          <div className="absolute inset-0 bg-[#25D366] opacity-20 blur-xl rounded-full"></div>
          <WhatsAppIcon className="w-9 h-9 text-[#25D366] relative z-10 drop-shadow-[0_0_10px_rgba(37,211,102,0.8)]" />
        </div>

        <h3 className="bg-clip-text text-transparent bg-gradient-to-r from-[#d4af37] via-[#fff4cc] to-[#b5852a] font-bold text-xl md:text-2xl mb-2">
          VIP হোয়াটসঅ্যাপ গ্রুপ
        </h3>
        
        <p className="text-[#dcd0c0]/80 text-sm mb-6 leading-relaxed">
          আমাদের এক্সক্লুসিভ স্টাডি গ্রুপে যুক্ত হোন। এখানে আপনি পাবেন লাইভ আপডেট, সাজেশন এবং গুরুত্বপূর্ণ নোটস।
        </p>

        <button 
          onClick={handleJoin}
          className="w-full bg-[#25D366] hover:bg-[#1fad53] text-[#0a140d] font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(37,211,102,0.4)] flex justify-center items-center gap-2 mb-3"
        >
          <WhatsAppIcon className="w-5 h-5" />
          <span>গ্রুপে যুক্ত হোন</span>
        </button>
        
        <button 
          onClick={handleDismiss}
          className="text-white/50 text-xs hover:text-white/80 transition-colors py-1 px-2"
        >
          পরে দেখবো
        </button>
      </div>
    </div>
  );
}
