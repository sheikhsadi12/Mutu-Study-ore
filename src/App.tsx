/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { PrivateRoute } from './components/PrivateRoute';
import { supabase } from './supabaseClient';
import { MessageCircle, Bot } from 'lucide-react';

import { Profile } from './pages/Profile';
import { Community } from './pages/Community';
import { AiChat } from './pages/AiChat';
import { AdminDashboard } from './pages/AdminDashboard';

import { PWAManager } from './components/PWAManager';
import { SplashScreen } from './components/SplashScreen';
import { useAndroidBackButton } from './hooks/useHardwareBack';

function AndroidBackButtonInterceptor() {
  useAndroidBackButton();
  return null;
}

function GlobalFABs() {
  const location = useLocation();

  const navigate = useNavigate();
  
  if (location.pathname !== '/') return null;

  return (
    <div id="global-fabs" className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3">
      <button 
        onClick={() => navigate('/community')}
        className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 bg-theme-bg border border-theme-border text-theme-accent-end hover:scale-105 hover:bg-theme-muted active:scale-95"
        title="Community"
      >
        <MessageCircle className="w-5 h-5" />
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

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    const syncUserToAdminDb = async (session: any) => {
       if (!session?.user) return;
       try {
           const { data: profile } = await supabase.from('profiles').select('username').eq('id', session.user.id).maybeSingle();
           const username = profile?.username || session.user.user_metadata?.username || 'New User';
           await supabase.from('admin_user_list').upsert({
              id: session.user.id,
              email: session.user.email || '',
              username: username,
              created_at: session.user.created_at || new Date().toISOString()
           });
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

  const isDarkMode = document.documentElement.classList.contains('dark');


  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <BrowserRouter>
        <AndroidBackButtonInterceptor />
        <PWAManager />
        <GlobalFABs />
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <Home 
                toggleTheme={toggleTheme} 
                isDarkMode={isDarkMode}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/ai-chat" 
          element={
            <PrivateRoute>
              <AiChat 
                toggleTheme={toggleTheme} 
                isDarkMode={isDarkMode}
              />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <PrivateRoute adminOnly={true}>
              <Admin />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/admin-dashboard" 
          element={
            <PrivateRoute adminOnly={true}>
              <AdminDashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <PrivateRoute>
              <Profile themeMode={themeMode} setThemeMode={setThemeMode} />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/community" 
          element={
            <PrivateRoute>
              <Community />
            </PrivateRoute>
          } 
        />
      </Routes>
      </BrowserRouter>
    </>
  );
}
