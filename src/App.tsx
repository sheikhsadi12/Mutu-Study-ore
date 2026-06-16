/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Home } from './pages/Home';
import { Admin } from './pages/Admin';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'admin'>('home');
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
    <>
      {currentView === 'home' ? (
        <Home 
           onNavigateToAdmin={() => setCurrentView('admin')} 
           toggleTheme={toggleTheme} 
           isDarkMode={isDarkMode}
           searchQuery={searchQuery}
           setSearchQuery={setSearchQuery}
        />
      ) : (
        <Admin 
           onBack={() => setCurrentView('home')} 
        />
      )}
    </>
  );
}
