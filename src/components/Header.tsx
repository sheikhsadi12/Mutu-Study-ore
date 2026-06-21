import React, { useState, useEffect, useRef } from 'react';
import { User, CheckCircle2, Settings, LogOut, Search, Moon, Sun, MonitorSmartphone, ArrowLeft, FileText, Printer, Key, MessageCircle, Clock, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Note } from '../types';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { ADMIN_EMAIL } from './PrivateRoute';
import { User as AuthUser } from '@supabase/supabase-js';
import { AppIcon } from './AppIcon';
import { BrandLogo } from './BrandLogo';

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
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [dbProfile, setDbProfile] = useState<{ username: string; avatar_url: string } | null>(null);
  const [geminiKey, setGeminiKey] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProfile = async (uId: string) => {
      const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', uId).maybeSingle();
      if (data) {
        setDbProfile(data);
      }
    };

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id);
      } else {
        setDbProfile(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id);
      } else {
        setDbProfile(null);
      }
    });

    const savedKey = localStorage.getItem('mutu_user_gemini_key');
    if (savedKey) {
      setGeminiKey(savedKey);
    }

    try {
      const stored = localStorage.getItem('mutu_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to parse recent searches', e);
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!searchQuery?.trim()) return;

    const timeoutId = setTimeout(() => {
      setRecentSearches(prev => {
        const query = searchQuery.trim();
        const filtered = prev.filter(q => q.toLowerCase() !== query.toLowerCase());
        const updated = [query, ...filtered].slice(0, 5);
        localStorage.setItem('mutu_recent_searches', JSON.stringify(updated));
        return updated;
      });
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        {(activeNote && onBack) || location.pathname !== '/' ? (
          <button 
            onClick={() => {
              if (activeNote && onBack) {
                onBack();
              } else {
                navigate('/');
              }
            }} 
            className="p-1.5 md:p-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/80 shrink-0"
            id="back-btn-header"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : null}
        
        <div className={cn("items-center gap-2 min-w-0", searchOpen ? "hidden md:flex" : "flex")}>
          {!activeNote ? (
            <BrandLogo 
              size={22} 
              animate={false} 
              showText={true} 
              className="cursor-pointer" 
              textClassName="text-sm md:text-lg"
              onClick={() => navigate('/')} 
            />
          ) : (
            <div 
              className="flex items-center gap-1 sm:gap-2 cursor-pointer min-w-0"
              onClick={() => navigate('/')}
            >
              <BrandLogo size={18} showText={false} />
              <span className="text-theme-border/50 mx-1 hidden sm:inline">|</span>
              <span className="text-xs font-semibold text-theme-text/70 truncate max-w-[120px] sm:max-w-[200px]">
                {activeNote.title}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {!activeNote && (
          <div className="relative flex items-center" ref={searchContainerRef}>
            <Search className={cn("w-4 h-4 absolute left-3 z-[11] pointer-events-none transition-colors", (searchQuery || searchOpen) ? "text-theme-accent-end" : "text-theme-text/60")} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              className={cn(
                "py-1.5 pl-9 pr-4 rounded-full text-xs outline-none transition-all duration-300 relative z-10",
                "bg-theme-muted/30 border border-theme-border/50 text-theme-text",
                (searchQuery || searchOpen) 
                  ? "w-48 sm:w-64 max-w-[50vw] bg-theme-bg border-theme-accent-end placeholder:text-theme-text/40 ring-1 ring-theme-accent-end/30" 
                  : "w-10 cursor-pointer text-transparent placeholder:text-transparent hover:bg-theme-muted/50",
                "focus:w-48 sm:focus:w-64 focus:max-w-xs focus:bg-theme-bg focus:border-theme-accent-end focus:ring-1 focus:ring-theme-accent-end/50 focus:text-theme-text focus:placeholder:text-theme-text/40 focus:cursor-text"
              )}
            />
            {searchOpen && !searchQuery && recentSearches.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-theme-bg border border-theme-border/50 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-1 py-1 min-w-[200px] left-0">
                <div className="px-3 py-1.5 text-[10px] font-bold text-theme-text/50 uppercase tracking-widest flex items-center justify-between">
                  <span>Recent Searches</span>
                </div>
                {recentSearches.map((term, i) => (
                  <div key={i} className="flex items-center justify-between px-1 hover:bg-theme-muted/50 transition-colors group cursor-pointer" onClick={() => { setSearchQuery(term); setSearchOpen(false); }}>
                    <div className="flex items-center gap-2 flex-1 px-2 py-1.5 min-w-0">
                      <Clock className="w-3 h-3 text-theme-text/40 shrink-0" />
                      <span className="text-xs text-theme-text/80 truncate group-hover:text-theme-accent-end transition-colors">{term}</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = recentSearches.filter(t => t !== term);
                        setRecentSearches(updated);
                        localStorage.setItem('mutu_recent_searches', JSON.stringify(updated));
                      }}
                      className="p-1.5 text-theme-text/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-md shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeNote?.type === 'STATIC_A4' && (
          <button
            onClick={() => window.print()}
            className="p-1.5 sm:p-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/80 outline-none"
            title="Save as PDF / Print"
          >
            <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
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
            {dbProfile?.avatar_url ? (
              <img src={dbProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-theme-accent-start text-white text-[10px] sm:text-xs font-bold">
                {(dbProfile?.username || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
