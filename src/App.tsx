/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Home } from './pages/Home';
import { AdminPanel } from './pages/AdminPanel';
import { Note } from './types';

const INITIAL_NOTES: Note[] = [
  {
    id: "n1",
    title: "Thermodynamics Core Insights",
    description: "Detailed derivations and theoretical framework for the Carnot cycle and entropy expressions.",
    type: "STATIC_A4",
    category: "Physics",
    sourceUrl: "<div><p>The Carnot cycle establishes the maximum possible efficiency of a heat engine operating between two reservoirs.</p><p class='arabic-text'>هذا مثال للنص العربي لمحاذاة الخط الرياضي.</p></div>",
    dateAdded: "2024-05-10"
  },
  {
    id: "n2",
    title: "Advanced Integration Simulator",
    description: "Interactive visualizer for bounded areas using fundamental calculus techniques.",
    type: "DYNAMIC_APPLET",
    category: "Mathematics",
    sourceUrl: "<div style='text-align: center;'><h3 style='font-family: sans-serif; margin-top: 20px;'>Interactive Canvas Area</h3><div style='width:200px; height:200px; background:radial-gradient(circle, #e8c3a2, #fff); margin: 0 auto; border-radius: 20px;'></div></div>",
    dateAdded: "2024-05-12"
  },
  {
    id: "n3",
    title: "Organic Chemistry Nomenclature",
    description: "IUPAC naming conventions cheat sheet and structural isomer references.",
    type: "STATIC_A4",
    category: "Chemistry",
    sourceUrl: "<div><h3>Alkanes and Alkenes</h3><p>Ensure you select the longest continuous carbon chain containing the principal functional group.</p></div>",
    dateAdded: "2024-05-15"
  }
];

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'admin'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const stored = localStorage.getItem('mutu_notes');
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return INITIAL_NOTES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('mutu_notes', JSON.stringify(notes));
    } catch (e) {
      console.warn('Storage bounds reached in root saver');
    }
  }, [notes]);

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
           notes={notes} 
           onNavigateToAdmin={() => setCurrentView('admin')} 
           toggleTheme={toggleTheme} 
           isDarkMode={isDarkMode}
           searchQuery={searchQuery}
           setSearchQuery={setSearchQuery}
        />
      ) : (
        <AdminPanel 
           notes={notes} 
           setNotes={setNotes} 
           onBack={() => setCurrentView('home')} 
        />
      )}
    </>
  );
}
