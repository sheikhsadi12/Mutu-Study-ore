import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { NoteView } from './NoteView';
import { Note } from '../types';
import { FileText, LayoutGrid, Clock, ChevronRight, Lock, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';


export function Home({ onNavigateToAdmin, toggleTheme, isDarkMode, searchQuery, setSearchQuery }: any) {
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [filter, setFilter] = useState('All');
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mutu_local_notes');
      if (stored) {
        setNotes(JSON.parse(stored) as Note[]);
      }
    } catch(e) {
      console.warn('Failed to parse local notes', e);
    }
  }, []);

  const filteredNotes = notes.filter((n: Note) => {
    const matchesCategory = filter === 'All' || n.category === filter;
    const searchMatch = searchQuery === '' || 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && searchMatch;
  });

  const categories = ['All', ...Array.from(new Set(notes.map((n: Note) => n.category)))];

  // Directory UI component shared for Mobile View and Desktop Left Panel
  const DirectoryView = ({ condensed = false }: { condensed?: boolean }) => (
    <div className={cn("overflow-y-auto h-full flex-1", condensed ? "p-3 md:p-4 space-y-3 bg-theme-muted/20" : "p-4 sm:p-6 lg:p-10 bg-theme-muted/10")}>
      {!condensed && (
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col mb-4 md:mb-6 gap-3 border-b border-theme-border/50 pb-4">
            <div>
              <h2 className="text-theme-text/70 font-bold uppercase tracking-widest text-xs md:text-sm">Knowledge Base Modules</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1.5 md:px-4 text-[10px] md:text-xs rounded-[25px] font-bold transition-all border shadow-sm cursor-pointer",
                    filter === f 
                      ? "bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white border-transparent" 
                      : "bg-theme-card border-theme-border text-theme-text/80 hover:bg-theme-muted hover:text-theme-accent-end"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredNotes.length === 0 && (
             <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
               <div className="w-20 h-20 mb-6 rounded-full bg-theme-muted flex items-center justify-center shadow-inner border border-theme-border/50 text-theme-accent-end/60">
                 <BookOpen className="w-10 h-10" />
               </div>
               <h3 className="font-heading font-black text-xl text-theme-accent-end mb-2">No Modules Found</h3>
               <p className="text-sm font-semibold opacity-70 max-w-sm mx-auto leading-relaxed text-theme-text/80">
                 No modules found. Please upload new study materials from the Admin Panel.
               </p>
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {filteredNotes.map((note: Note) => (
              <div 
                key={note.id}
                onClick={() => setActiveNote(note)}
                className={cn(
                  "card-base relative group cursor-pointer transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] md:hover:-translate-y-1 h-full",
                  activeNote?.id === note.id ? "ring-2 ring-theme-accent-end ring-offset-2 ring-offset-theme-bg" : ""
                )}
              >
                <div className="card-top-accent" />
                <div className="p-4 md:p-6 flex flex-col h-full bg-theme-card isolate relative">
                  <div className="flex justify-between items-start mb-3 md:mb-4">
                    <div className="p-2.5 md:p-3 bg-theme-muted rounded-[14px] text-theme-accent-end group-hover:scale-110 transition-transform">
                      {note.type === 'STATIC_A4' ? <FileText className="w-4 h-4 md:w-6 md:h-6"/> : <LayoutGrid className="w-4 h-4 md:w-6 md:h-6"/>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[8px] md:text-[9px] font-black tracking-widest uppercase bg-theme-border/20 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-theme-accent-end">
                        {note.category}
                      </span>
                      {note.chapter && <span className="text-[8px] font-bold opacity-60 uppercase">{note.chapter}</span>}
                    </div>
                  </div>
                  <h3 className="font-heading font-bold text-base md:text-xl mb-1.5 md:mb-2 group-hover:text-theme-accent-end transition-colors line-clamp-2 md:min-h-[56px]">{note.title}</h3>
                  <p className="text-xs md:text-sm text-theme-text/80 mb-4 md:mb-6 flex-1 font-arabic line-clamp-3 md:leading-relaxed">
                    {note.description}
                  </p>
                  <div className="flex items-center justify-between text-[9px] md:text-[10px] text-theme-text/50 font-bold uppercase tracking-wider pt-3 md:pt-4 border-t border-theme-border/40">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                      {new Date(note.dateAdded).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <span className="text-theme-accent-end/60">{note.type === 'STATIC_A4' ? 'Document' : 'Applet'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {condensed && (
        <div className="space-y-2 md:space-y-3 pb-8">
          <p className="text-[9px] md:text-[10px] font-black text-theme-text/40 uppercase tracking-widest mb-2 px-2">Synced Modules</p>
          {filteredNotes.map((note: Note) => (
            <div 
              key={note.id} 
              onClick={() => setActiveNote(note)}
              className={cn(
                "card-base p-2.5 md:p-3 cursor-pointer transition-colors flex items-center gap-2.5 md:gap-3 relative group",
                activeNote?.id === note.id ? "border-theme-accent-end bg-theme-accent-start/5" : "bg-theme-card hover:border-theme-accent-end/50"
              )}
            >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-theme-muted flex items-center justify-center text-theme-accent-end shrink-0 shadow-inner">
                {note.type === 'STATIC_A4' ? <FileText className="w-3.5 h-3.5 md:w-4 md:h-4"/> : <LayoutGrid className="w-3.5 h-3.5 md:w-4 md:h-4"/>}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <h4 className="font-semibold text-xs md:text-sm truncate group-hover:text-theme-accent-end transition-colors">{note.title}</h4>
                <p className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-theme-text/50 truncate flex items-center gap-1">
                  {note.category} <span className="w-1 h-1 rounded-full bg-theme-border"></span> {note.type === 'STATIC_A4' ? 'DOC' : 'APP'}
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-theme-text/30 group-hover:text-theme-accent-end" />
            </div>
          ))}
          
          <div className="mt-4 md:mt-6 p-3 md:p-4 rounded-xl border border-dashed border-theme-border/60 bg-theme-bg/50 flex flex-col items-center justify-center text-center gap-1.5 opacity-60">
            <Lock className="w-4 h-4 md:w-5 md:h-5 text-theme-text/50 mb-1" />
            <p className="text-[9px] md:text-[11px] font-bold text-theme-text/50 uppercase tracking-wider">More modules locked</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-theme-bg overflow-hidden relative">
      <Header 
        onNavigateToAdmin={onNavigateToAdmin} 
        toggleTheme={toggleTheme} 
        isDarkMode={isDarkMode} 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery}
        activeNote={activeNote}
        onBack={() => setActiveNote(null)}
      />
      
      {/* UNIFIED EXACT ARCHITECTURE */}
      <div className="flex flex-col h-[calc(100vh-48px)] w-full relative">
        {!activeNote ? (
          <DirectoryView condensed={false} />
        ) : (
          <NoteView note={activeNote} onBack={() => setActiveNote(null)} isDarkMode={isDarkMode} />
        )}
      </div>
    </div>
  );
}
