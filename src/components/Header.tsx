import React, { useState } from 'react';
import { User, CheckCircle2, Settings, LogOut, Search, Moon, Sun, MonitorSmartphone } from 'lucide-react';
import { cn } from '../lib/utils';

export function Header({ onNavigateToAdmin, toggleTheme, isDarkMode, searchQuery, setSearchQuery }: any) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="h-[52px] px-4 md:px-6 flex items-center justify-between border-b border-theme-border bg-theme-bg shrink-0 z-10 relative w-full">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-theme-accent-start to-theme-accent-end rounded-[6px] flex items-center justify-center text-white font-bold text-sm md:text-lg shrink-0">M</div>
        <h1 className="text-lg md:text-xl tracking-tight font-heading font-bold text-theme-accent-start truncate flex-1 min-w-0">
          MUTU STUDY
        </h1>
        <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-theme-muted text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-theme-accent-end shrink-0">
          Core PWA
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="relative group flex items-center">
          <Search className="w-3.5 h-3.5 md:w-4 md:h-4 text-theme-text/50 absolute left-2.5 md:left-3" />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 md:pl-9 md:pr-4 py-1 md:py-1.5 bg-theme-muted/50 border border-theme-border/50 rounded-full text-[11px] md:text-xs focus:outline-none focus:border-theme-accent-end focus:ring-1 focus:ring-theme-accent-end transition-all w-24 sm:w-32 md:w-48 lg:w-64"
          />
        </div>

        <div className="relative flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-theme-border">
          <div className="hidden md:block text-right leading-tight">
            <p className="text-xs font-bold text-theme-text">Sheikh Sadi</p>
            <p className="text-[10px] text-theme-accent-end font-semibold">Verified Admin</p>
          </div>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-center w-7 h-7 md:w-9 md:h-9 overflow-hidden p-0 rounded-full border-2 border-theme-accent-start bg-theme-border hover:border-theme-accent-end transition-colors cursor-pointer shrink-0"
          >
            <div className="w-full h-full flex items-center justify-center bg-theme-accent-start text-white text-[10px] md:text-xs font-bold">
              SS
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute top-full right-0 mt-3 w-52 md:w-56 card-base shadow-xl z-50">
              <div className="card-top-accent" />
              <div className="p-4 border-b border-theme-border/30">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold font-heading text-base md:text-lg truncate">Sheikh Sadi</p>
                  <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-theme-accent-end shrink-0" />
                </div>
                <p className="text-[10px] md:text-xs text-theme-text/60">Administrator</p>
              </div>
              <div className="p-2 flex flex-col gap-1">
                <button onClick={toggleTheme} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-theme-muted text-xs md:text-sm transition-colors text-left w-full text-theme-text/80">
                  {isDarkMode ? <Sun className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Moon className="w-3.5 h-3.5 md:w-4 md:h-4" />} 
                  Toggle {isDarkMode ? 'Light' : 'Dark'} Mode
                </button>
                <button onClick={() => { setDropdownOpen(false); onNavigateToAdmin(); }} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-theme-muted text-xs md:text-sm transition-colors text-left w-full text-theme-text/80">
                  <MonitorSmartphone className="w-3.5 h-3.5 md:w-4 md:h-4" /> Admin Portal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
