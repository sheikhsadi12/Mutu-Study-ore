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

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage or existing dark class
    const saved = localStorage.getItem('theme_preference');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      return true;
    } else if (saved === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      return false;
    }
    // Fall back to class if neither exists
    return document.documentElement.classList.contains('dark');
  });

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    if (isDark) {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme_preference', 'dark');
    } else {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme_preference', 'light');
    }
    setIsDarkMode(isDark);
  };

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
      </Routes>
    </BrowserRouter>
  );
}
