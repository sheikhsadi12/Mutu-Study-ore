/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { PrivateRoute } from './components/PrivateRoute';
import { supabase } from './supabaseClient';

import { Profile } from './pages/Profile';
import { Community } from './pages/Community';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('theme_preference') as 'light' | 'dark' | 'system') || 'system';
  });

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
    <BrowserRouter>
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
          path="/admin" 
          element={
            <PrivateRoute adminOnly={true}>
              <Admin />
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
  );
}
