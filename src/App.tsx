/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { OfflineNotification } from './components/OfflineNotification';
import { motion, AnimatePresence } from 'motion/react';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { PrivateRoute } from './components/PrivateRoute';
import { supabase } from './supabaseClient';
import { MessageCircle, Bot } from 'lucide-react';

import { Profile } from './pages/Profile';
import { Community } from './pages/Community';
import { AiChat } from './pages/AiChat';
import { EliteSuggestions } from './pages/EliteSuggestions';
import { AdminDashboard } from './pages/AdminDashboard';
import { PersonalInbox } from './pages/PersonalInbox';

import { PWAManager } from './components/PWAManager';
import { SplashScreen } from './components/SplashScreen';
import { useHardwareBack } from './hooks/useHardwareBack';

function AndroidBackButtonInterceptor() {
  useHardwareBack();
  return null;
}

function GlobalFABs({ hasUnread, setHasUnread, currentUserId }: { hasUnread: boolean; setHasUnread: (v: boolean) => void; currentUserId: string | null }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Show ONLY on the homepage for authenticated users
  if (!currentUserId || location.pathname !== '/') return null;

  return (
    <div id="global-fabs" className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3">
      <button 
        onClick={() => {
          setHasUnread(false);
          navigate('/community');
        }}
        className="relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 bg-theme-bg border border-theme-border text-theme-accent-end hover:scale-105 hover:bg-theme-muted active:scale-95"
        title="Community"
      >
        <MessageCircle className="w-5 h-5" />
        {hasUnread && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-[#2a020b] rounded-full animate-pulse"></span>
        )}
      </button>
      <button 
        onClick={() => navigate('/ai-chat')}
        className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 bg-gradient-to-tr from-theme-accent-start to-theme-accent-end text-white hover:scale-105 active:scale-95"
        title="AI Chat"
      >
        <Bot className="w-6 h-6" />
      </button>
    </div>
  );
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="w-full h-full absolute inset-0 overflow-y-auto overflow-x-hidden"
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes({ toggleTheme, isDarkMode, searchQuery, setSearchQuery, themeMode, setThemeMode }: any) {
  const location = useLocation();

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <PageTransition>
                  <Dashboard 
                    toggleTheme={toggleTheme} 
                    isDarkMode={isDarkMode}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                  />
                </PageTransition>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/notes" 
            element={
              <PrivateRoute>
                <PageTransition>
                  <Home 
                    toggleTheme={toggleTheme} 
                    isDarkMode={isDarkMode}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                  />
                </PageTransition>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/elite-suggestions" 
            element={
              <PrivateRoute>
                <PageTransition>
                  <EliteSuggestions 
                    toggleTheme={toggleTheme} 
                    isDarkMode={isDarkMode}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                  />
                </PageTransition>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/ai-chat" 
            element={
              <PrivateRoute>
                <PageTransition>
                  <AiChat 
                    toggleTheme={toggleTheme} 
                    isDarkMode={isDarkMode}
                  />
                </PageTransition>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <PrivateRoute adminOnly={true}>
                <PageTransition><Admin /></PageTransition>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin-dashboard" 
            element={
              <PrivateRoute adminOnly={true}>
                <PageTransition><AdminDashboard /></PageTransition>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <PrivateRoute>
                <PageTransition><Profile themeMode={themeMode} setThemeMode={setThemeMode} /></PageTransition>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/community" 
            element={
              <PrivateRoute>
                <PageTransition><Community /></PageTransition>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/inbox" 
            element={
              <PrivateRoute>
                <PageTransition><PersonalInbox toggleTheme={toggleTheme} isDarkMode={isDarkMode} /></PageTransition>
              </PrivateRoute>
            } 
          />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnread, setHasUnread] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
       setCurrentUserId(session?.user?.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    
    const currentUser = { id: currentUserId };

    // Subscribed globally to the messages table as requested
    const channel = supabase.channel('global-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => { 
        if (payload.new.user_id !== currentUser?.id) { 
          setHasUnread(true); 
        } 
      })
      .subscribe();

    // Also listening on the alternate community_messages table to guarantee 100% operation across schema variants
    const channelComm = supabase.channel('global-unread-community')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages' }, (payload) => { 
        if (payload.new.user_id !== currentUser?.id) { 
          setHasUnread(true); 
        } 
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(channelComm);
    };
  }, [currentUserId]);

  useEffect(() => {
    const syncUserToAdminDb = async (session: any) => {
       if (!session?.user) return;
       try {
           const { data: profile } = await supabase.from('profiles').select('username, avatar_url, full_name').eq('id', session.user.id).maybeSingle();
           const username = profile?.username || session.user.user_metadata?.username || 'New User';
           const full_name = session.user.user_metadata?.full_name || profile?.full_name || '';
           const avatar_url = session.user.user_metadata?.avatar_url || profile?.avatar_url || '';

           // Upsert to profiles
           await supabase.from('profiles').upsert({
              id: session.user.id,
              email: session.user.email || '',
              username: username,
              full_name: full_name,
              avatar_url: avatar_url,
              created_at: session.user.created_at || new Date().toISOString()
           }, { onConflict: 'id' });

           // Upsert to admin_user_list for legacy compatibility
           await supabase.from('admin_user_list').upsert({
              id: session.user.id,
              email: session.user.email || '',
              username: username,
              created_at: session.user.created_at || new Date().toISOString()
           }, { onConflict: 'id' });
       } catch(err) {
           console.error("Global silent sync error:", err);
       }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
       syncUserToAdminDb(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
       syncUserToAdminDb(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('theme_preference') as 'light' | 'dark' | 'system') || 'system';
  });

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      root.classList.remove('light', 'dark');
      
      if (themeMode === 'system') {
        root.classList.add(isSystemDark ? 'dark' : 'light');
      } else {
        root.classList.add(themeMode);
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (themeMode === 'system') applyTheme();
    };
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  const toggleTheme = () => {
    // Only toggling between dark/light from the header
    setThemeMode(prev => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme_preference', nextTheme);
      return nextTheme;
    });
  };

  const isDarkMode = themeMode === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    : themeMode === 'dark';


  return (
    <>
      <OfflineNotification />
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <BrowserRouter>
        <AndroidBackButtonInterceptor />
        <PWAManager />
        <GlobalFABs hasUnread={hasUnread} setHasUnread={setHasUnread} currentUserId={currentUserId} />
        <AnimatedRoutes 
          toggleTheme={toggleTheme} 
          isDarkMode={isDarkMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
        />
      </BrowserRouter>
    </>
  );
}
