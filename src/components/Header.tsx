import React, { useState, useEffect } from 'react';
import { User, CheckCircle2, Settings, LogOut, Search, Moon, Sun, MonitorSmartphone, ArrowLeft, FileText, Printer, Key } from 'lucide-react';
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

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Toggle Search Bar on Mobile */}
        {!activeNote && (
          <div className={cn("relative group flex items-center transition-all", searchOpen ? "w-48 sm:w-64" : "w-auto")}>
            <Search 
              onClick={() => setSearchOpen(!searchOpen)}
              className="w-4 h-4 text-theme-text/80 sm:hidden cursor-pointer p-0.5 hover:bg-theme-muted rounded-full" 
            />
            <Search className={cn("w-3.5 h-3.5 text-theme-text/50 absolute left-2.5 hidden sm:block", searchOpen && 'block')} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "py-1.5 bg-theme-muted/50 border border-theme-border/50 rounded-full text-xs focus:outline-none focus:border-theme-accent-end focus:ring-1 focus:ring-theme-accent-end transition-all",
                searchOpen ? "pl-8 pr-3 w-full block" : "hidden sm:block pl-8 pr-3 w-32 md:w-48 xl:w-64"
              )}
            />
          </div>
        )}

        {activeNote && activeNote.type === 'STATIC_A4' && (
           <button 
             onClick={() => alert('Print triggered! (Simulation only)')} 
             className="p-1.5 sm:p-2 rounded-full hover:bg-theme-muted transition-colors text-theme-accent-end dark:text-theme-text" 
             title="Print to PDF"
           >
             <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
           </button>
        )}

        <button 
          onClick={toggleTheme} 
          className="p-1.5 sm:p-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/80"
        >
          {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />} 
        </button>

        <div className="relative flex items-center border-l border-theme-border pl-1 sm:pl-2 ml-1 sm:ml-2">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 overflow-hidden p-0 rounded-full border-2 border-theme-accent-start bg-theme-border hover:border-theme-accent-end transition-colors cursor-pointer shrink-0"
          >
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-theme-accent-start text-white text-[10px] sm:text-xs font-bold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 card-base shadow-xl z-50 p-2 border border-theme-border/50 bg-theme-bg">
              <div className="p-3 border-b border-theme-border/30">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold font-heading text-sm truncate">{user?.user_metadata?.full_name || user?.email}</p>
                  {user?.email === ADMIN_EMAIL && <CheckCircle2 className="w-3.5 h-3.5 text-theme-accent-end shrink-0" />}
                </div>
                <p className="text-[10px] text-theme-text/60">{user?.email}</p>
              </div>
              
              <div className="p-3 border-b border-theme-border/30">
                <label className="text-[10px] uppercase font-bold text-theme-text/70 flex items-center gap-1 mb-2">
                  <Key className="w-3 h-3" /> Gemini API Key
                </label>
                <input 
                  type="password" 
                  placeholder="AI Key (Saved Locally)" 
                  value={geminiKey}
                  onChange={handleSaveGeminiKey}
                  className="w-full py-1.5 px-3 bg-theme-muted/50 border border-theme-border/50 rounded-md text-xs focus:outline-none focus:border-theme-accent-end focus:ring-1 focus:ring-theme-accent-end transition-all text-theme-text"
                />
              </div>

              <div className="p-1.5">
                {user?.email === ADMIN_EMAIL && (
                  <button onClick={() => { setDropdownOpen(false); navigate('/admin'); }} className="flex items-center gap-2.5 px-2 py-2 mb-1 rounded-md hover:bg-theme-muted text-xs sm:text-sm transition-colors text-left w-full text-theme-text/80 font-medium">
                    <MonitorSmartphone className="w-4 h-4" /> Admin Portal
                  </button>
                )}
                <button onClick={handleLogout} className="flex items-center gap-2.5 px-2 py-2 mb-1 rounded-md hover:bg-rose-500/10 hover:text-rose-500 text-xs sm:text-sm transition-colors text-left w-full text-theme-text/80 font-medium">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
                <button onClick={async () => {
                  if (window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")) {
                    try {
                      // Note: True deletion requires a Supabase edge function or RPC. 
                      // Here we attempt an RPC call or fallback to logging out if missing.
                      const { error } = await supabase.rpc('delete_user');
                      if (error) {
                         alert("Note: Account deletion requires the 'delete_user' RPC to be set up in your Supabase database. Please contact the administrator.");
                      } else {
                         await supabase.auth.signOut();
                         navigate('/login');
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  }
                }} className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-red-600 hover:text-white bg-red-500/10 text-red-500 text-xs sm:text-sm transition-colors text-left w-full font-bold mt-2">
                  Permanently Delete Account 
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
