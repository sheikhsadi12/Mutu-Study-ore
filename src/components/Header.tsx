import React, { useState, useEffect } from 'react';
import { User, CheckCircle2, Settings, LogOut, Search, Moon, Sun, MonitorSmartphone, ArrowLeft, FileText, Printer, Key, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { Note } from '../types';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ADMIN_EMAIL } from './PrivateRoute';
import { User as AuthUser } from '@supabase/supabase-js';

interface HeaderProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeNote?: Note | null;
  onBack?: () => void;
}

export function Header({ toggleTheme, isDarkMode, searchQuery, setSearchQuery, activeNote, onBack }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [geminiKey, setGeminiKey] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const savedKey = localStorage.getItem('mutu_user_gemini_key');
    if (savedKey) {
      setGeminiKey(savedKey);
    }
  }, []);

  const handleSaveGeminiKey = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGeminiKey(val);
    localStorage.setItem('mutu_user_gemini_key', val);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <header className="h-[48px] px-2 md:px-4 flex items-center justify-between border-b border-theme-border bg-theme-bg shrink-0 z-50 relative w-full">
      <div className="flex items-center gap-1.5 md:gap-3 min-w-0">
        {activeNote && onBack && (
          <button onClick={onBack} className="p-1.5 md:p-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/80 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        
        {!searchOpen && (
          <div className="flex items-center gap-2 min-w-0">
            {!activeNote && <div className="w-6 h-6 bg-gradient-to-br from-theme-accent-start to-theme-accent-end rounded-[6px] flex items-center justify-center text-white font-bold text-xs shrink-0 hidden sm:flex">M</div>}
            <h1 className="text-sm md:text-lg tracking-tight font-heading font-black text-theme-accent-start truncate shrink-0 cursor-pointer" onClick={() => navigate('/')}>
              MUTU STUDY
            </h1>
            {activeNote && (
              <>
                <span className="text-theme-border/50 mx-1 hidden sm:inline">|</span>
                <span className="text-xs font-semibold text-theme-text/70 truncate hidden sm:inline-block">
                  {activeNote.title}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {!activeNote && (
          <div className="relative flex items-center">
            <Search className={cn("w-4 h-4 absolute left-3 pointer-events-none transition-colors", (searchQuery || searchOpen) ? "text-theme-accent-end" : "text-theme-text/60")} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setSearchOpen(false)}
              className={cn(
                "py-1.5 pl-9 pr-4 rounded-full text-xs outline-none transition-all duration-300",
                "bg-theme-muted/30 border border-theme-border/50 text-theme-text",
                (searchQuery || searchOpen) 
                  ? "w-48 sm:w-64 max-w-[50vw] bg-theme-bg border-theme-accent-end placeholder:text-theme-text/40 ring-1 ring-theme-accent-end/30" 
                  : "w-10 cursor-pointer text-transparent placeholder:text-transparent hover:bg-theme-muted/50",
                "focus:w-48 sm:focus:w-64 focus:max-w-xs focus:bg-theme-bg focus:border-theme-accent-end focus:ring-1 focus:ring-theme-accent-end/50 focus:text-theme-text focus:placeholder:text-theme-text/40 focus:cursor-text"
              )}
            />
          </div>
        )}

        <button 
          onClick={toggleTheme} 
          className="p-1.5 sm:p-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/80 outline-none"
        >
          {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />} 
        </button>

        <div className="relative flex items-center border-l border-theme-border pl-1.5 sm:pl-2 ml-0 sm:ml-1">
          <button 
            onClick={() => navigate('/profile')}
            className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 overflow-hidden p-0 rounded-full border border-theme-border bg-theme-muted hover:border-theme-accent-end transition-colors cursor-pointer shrink-0 outline-none ring-offset-theme-bg focus-visible:ring-2 focus-visible:ring-theme-accent-end ring-offset-1"
          >
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-theme-accent-start text-white text-[10px] sm:text-xs font-bold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
