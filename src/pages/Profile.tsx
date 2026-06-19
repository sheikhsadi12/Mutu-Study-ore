import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ADMIN_EMAIL } from '../components/PrivateRoute';
import { ArrowLeft, User, LogOut, Search, Moon, Sun, MonitorSmartphone, Settings, Key, CheckCircle2, ShieldAlert, Monitor, Trash2 } from 'lucide-react';
import { User as AuthUser } from '@supabase/supabase-js';

interface ProfileProps {
  themeMode: 'light' | 'dark' | 'system';
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
}

export function Profile({ themeMode, setThemeMode }: ProfileProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [communityProfile, setCommunityProfile] = useState<{username: string, avatar_url: string} | null>(null);
  const [dbIsAdmin, setDbIsAdmin] = useState(false);
  const [coAdmins, setCoAdmins] = useState<{ id: string; email?: string; full_name?: string; username?: string; avatar_url?: string; is_admin?: boolean }[]>([]);
  const [geminiKey, setGeminiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadProfileData = async (u: AuthUser) => {
      try {
        const { data } = await supabase.from('profiles').select('username, avatar_url, is_admin').eq('id', u.id).maybeSingle();
        const isUserAdmin = u.email === ADMIN_EMAIL || data?.is_admin === true;
        setDbIsAdmin(isUserAdmin);
        
        if (data && data.username) {
          setCommunityProfile(data);
        }

        if (isUserAdmin) {
          const { data: admins } = await supabase
            .from('profiles')
            .select('id, email, full_name, username, avatar_url, is_admin')
            .eq('is_admin', true);
          if (admins) {
            setCoAdmins(admins);
          }
        }
      } catch (err) {
        console.error('Failed to load profile details:', err);
      }
    };

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        await loadProfileData(u);
      }
      setLoading(false);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        await loadProfileData(u);
      } else {
        setCommunityProfile(null);
        setDbIsAdmin(false);
        setCoAdmins([]);
      }
      setLoading(false);
    });

    const savedKey = localStorage.getItem('mutu_user_gemini_key');
    if (savedKey) {
      setGeminiKey(savedKey);
    }

    return () => {
      subscription.unsubscribe();
    };
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

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")) {
      try {
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
  };

  const handleThemeChange = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    localStorage.setItem('theme_preference', mode);
  };

  const handleExitProfile = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-theme-accent-start border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-theme-bg flex flex-col items-center justify-center font-sans p-4 text-center">
        <div className="w-16 h-16 bg-red-500/15 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-heading font-black text-theme-text mb-2">Access Denied</h2>
        <p className="text-sm text-theme-text/60 max-w-sm mb-6">You must be fully authenticated to view this profile screen.</p>
        <button onClick={() => navigate('/login')} className="px-6 py-2.5 rounded-xl bg-theme-accent-start text-white font-bold hover:opacity-90 transition-all text-sm">
          Go to Sign In
        </button>
      </div>
    );
  }

  const isSystemAdmin = user.email === ADMIN_EMAIL;
  const isActualAdmin = isSystemAdmin || dbIsAdmin;
  const createdDate = new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-theme-bg flex flex-col font-sans">
      {/* Header Area */}
      <header className="h-[56px] px-4 md:px-6 flex items-center border-b border-theme-border bg-theme-bg shrink-0 z-50 sticky top-0">
        <button onClick={handleExitProfile} className="p-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/80 mr-3" title="Back to Home">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg md:text-xl font-heading font-black text-theme-accent-start">
          {isActualAdmin ? 'Admin Profile' : 'User Profile'}
        </h1>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-300">
        
        {/* User Card */}
        <section className="card-base p-6 md:p-8 rounded-[20px] shadow-sm relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center gap-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-theme-accent-end/10 rounded-bl-full -z-10" />
          
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-theme-bg shadow-lg bg-theme-border flex items-center justify-center overflow-hidden shrink-0 relative">
            {user.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-black text-theme-accent-start uppercase">{user.email?.charAt(0) || 'U'}</span>
            )}
            {isActualAdmin && (
              <div className="absolute bottom-1 right-1 bg-theme-accent-end rounded-full p-1 border-2 border-theme-bg">
                <ShieldAlert className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold font-heading text-theme-text truncate mb-1">
              {user.user_metadata?.full_name || communityProfile?.username || 'Student User'}
            </h2>
            <p className="text-theme-text/70">{user.email}</p>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4">
              <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${
                isSystemAdmin 
                  ? 'bg-theme-accent-end/10 text-theme-accent-end border border-theme-accent-end/20' 
                  : dbIsAdmin 
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                  : 'bg-theme-accent-start/10 text-theme-accent-start border border-theme-accent-start/20'
              }`}>
                {isSystemAdmin ? 'Master Admin' : dbIsAdmin ? 'Co-Admin' : 'Active Student'}
              </span>
              <span className="text-xs text-theme-text/50">
                Member since {createdDate}
              </span>
            </div>
          </div>
        </section>

        {/* Co-Administrators List (Only visible if the current logged-in user is an Admin) */}
        {isActualAdmin && (
          <section className="card-base p-6 md:p-8 rounded-[20px] shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-theme-text border-b border-theme-border/50 pb-3">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <h3 className="font-heading font-bold text-lg">Co-Administrators</h3>
            </div>
            <p className="text-xs text-theme-text/55 leading-relaxed mb-4">
              Below are the registered administrators holding platform moderating authority:
            </p>
            
            <div className="grid gap-3">
              {coAdmins.length === 0 ? (
                <div className="text-xs text-theme-text/50 py-2 italic">Retrieving admin list...</div>
              ) : (
                coAdmins.map((admin) => (
                  <div key={admin.id} className="flex items-center gap-3 p-3 rounded-xl bg-theme-muted/20 border border-theme-border/30">
                    <img 
                      src={admin.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${admin.id}`} 
                      alt="Admin Avatar" 
                      className="w-8 h-8 rounded-full border border-theme-border shrink-0" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-theme-text truncate">
                          {admin.full_name || admin.username || 'Admin User'}
                        </span>
                        {admin.email === ADMIN_EMAIL && (
                          <span className="text-[10px] scale-90 px-1.5 py-0.5 bg-theme-accent-end/15 text-theme-accent-end font-semibold rounded uppercase">System</span>
                        )}
                        {admin.id === user.id && (
                          <span className="text-[10px] scale-90 px-1.5 py-0.5 bg-green-500/15 text-green-500 font-semibold rounded uppercase">You</span>
                        )}
                      </div>
                      <span className="text-[10px] text-theme-text/50 block truncate">{admin.email || 'Confidential'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Community Profile Settings */}
        <section className="card-base p-6 md:p-8 rounded-[20px] shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-theme-text border-b border-theme-border/50 pb-4">
            <User className="w-5 h-5 text-theme-accent-start" />
            <h3 className="font-heading font-bold text-lg">Community Identity</h3>
          </div>
          
          <div className="space-y-4">
            <p className="text-xs text-theme-text/50 leading-relaxed mb-3">
              This is your public identity in the Global Community Chat. Your real email is strictly hidden. You can change this at any time to remain anonymous.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
               <div className="w-16 h-16 rounded-full border-2 border-theme-accent-start/50 overflow-hidden shrink-0 bg-theme-muted">
                  <img src={communityProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`} alt="Current Avatar" className="w-full h-full object-cover" />
               </div>
               <div className="flex-1 w-full flex flex-col gap-2">
                 <button onClick={() => navigate('/community?setup=true')} className="w-full sm:w-auto py-3 px-4 bg-theme-muted/50 border border-theme-border rounded-xl text-sm font-bold hover:bg-theme-muted transition-colors text-theme-text text-left flex justify-between items-center group">
                   <div className="flex flex-col">
                     <span className="text-xs text-theme-text/50 uppercase tracking-wider mb-0.5 font-semibold">Active Nickname</span>
                     <span>{communityProfile?.username || 'Not Set'}</span>
                   </div>
                   <ArrowLeft className="w-4 h-4 rotate-180 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                 </button>
               </div>
            </div>
          </div>
        </section>

        {/* Theme Settings */}
        <section className="card-base p-6 md:p-8 rounded-[20px] shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-theme-text border-b border-theme-border/50 pb-4">
            <MonitorSmartphone className="w-5 h-5 text-theme-accent-start" />
            <h3 className="font-heading font-bold text-lg">Appearance & Theme</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button 
              onClick={() => handleThemeChange('light')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${themeMode === 'light' ? 'border-theme-accent-start bg-theme-accent-start/5 text-theme-accent-start' : 'border-theme-border bg-theme-muted/30 text-theme-text/70 hover:border-theme-border/80 hover:bg-theme-muted'}`}
            >
              <Sun className="w-5 h-5" />
              <span className="font-bold text-sm">Light</span>
            </button>
            <button 
              onClick={() => handleThemeChange('dark')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${themeMode === 'dark' ? 'border-theme-accent-start bg-theme-accent-start/5 text-theme-accent-start' : 'border-theme-border bg-theme-muted/30 text-theme-text/70 hover:border-theme-border/80 hover:bg-theme-muted'}`}
            >
              <Moon className="w-5 h-5" />
              <span className="font-bold text-sm">Dark</span>
            </button>
            <button 
              onClick={() => handleThemeChange('system')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${themeMode === 'system' ? 'border-theme-accent-start bg-theme-accent-start/5 text-theme-accent-start' : 'border-theme-border bg-theme-muted/30 text-theme-text/70 hover:border-theme-border/80 hover:bg-theme-muted'}`}
            >
              <Monitor className="w-5 h-5" />
              <span className="font-bold text-sm">System Default</span>
            </button>
          </div>
        </section>

        {/* API Settings */}
        <section className="card-base p-6 md:p-8 rounded-[20px] shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-theme-text border-b border-theme-border/50 pb-4">
            <Key className="w-5 h-5 text-theme-accent-end" />
            <h3 className="font-heading font-bold text-lg">AI Configuration</h3>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-theme-text/70">Personal Gemini API Key (Optional Override)</label>
            <p className="text-xs text-theme-text/50 leading-relaxed mb-3">
              The application uses a master API key by default. If the master quota limit is reached, you can paste your personal Google Gemini API key below to continue using Mutu AI interactively.
            </p>
            <input 
              type="password" 
              placeholder="Paste custom AI Key and it saves automatically..." 
              value={geminiKey}
              onChange={handleSaveGeminiKey}
              className="w-full py-3 px-4 bg-theme-bg border border-theme-border/80 rounded-xl text-sm focus:outline-none focus:border-theme-accent-end focus:ring-1 focus:ring-theme-accent-end transition-all text-theme-text"
            />
          </div>
        </section>

        {/* Danger Zone / Admin Zone */}
        <section className="space-y-4">
          {isActualAdmin && (
            <button onClick={() => navigate('/admin')} className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white font-bold shadow-md hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all text-base">
              <ShieldAlert className="w-5 h-5" /> Enter Admin Portal
            </button>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-theme-border/30">
            <button onClick={handleLogout} className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border border-theme-border bg-theme-bg text-theme-text/80 hover:bg-theme-muted hover:text-theme-text font-bold text-sm transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out from Mutu Study
            </button>
            <button onClick={handleDeleteAccount} className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 hover:bg-red-500 hover:text-white font-bold text-sm transition-all group">
              <Trash2 className="w-4 h-4 group-hover:animate-pulse" /> Permanently Delete Account
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}
