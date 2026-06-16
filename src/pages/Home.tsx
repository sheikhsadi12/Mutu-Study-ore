import React, { useState } from 'react';
import { Header } from '../components/Header';
import { NoteView } from './NoteView';
import { Note } from '../types';
import { FileText, LayoutGrid, Clock, ChevronRight, Lock } from 'lucide-react';
import { cn } from '../lib/utils';


export function Home({ notes, onNavigateToAdmin, toggleTheme, isDarkMode, searchQuery, setSearchQuery }: any) {
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [filter, setFilter] = useState('All');

  const filteredNotes = notes.filter((n: Note) => {
    const matchesCategory = filter === 'All' || n.category === filter;
    const searchMatch = searchQuery === '' || 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && searchMatch;
  });

  // Directory UI component shared for Mobile View and Desktop Left Panel
  const DirectoryView = ({ condensed = false }: { condensed?: boolean }) => (
    <div className={cn("overflow-y-auto h-full flex-1", condensed ? "p-3 md:p-4 space-y-3 bg-theme-muted/20" : "p-4 sm:p-6 lg:p-10 bg-theme-muted/10")}>
      {!condensed && (
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-8 gap-4 border-b border-theme-border/50 pb-4 md:pb-6">
            <div>
              <h2 className="font-heading font-black text-2xl md:text-3xl lg:text-4xl mb-1 text-theme-accent-end">Core Directory</h2>
              <p className="text-theme-text/60 font-semibold uppercase tracking-widest text-[10px] md:text-xs">Knowledge Base Modules</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['All', 'Mathematics', 'Physics', 'Chemistry', 'Biology'].map(f => (
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
             <div className="text-center py-12 opacity-50">
                <p className="font-bold text-sm uppercase tracking-wider">No materials found.</p>
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
      <Header onNavigateToAdmin={onNavigateToAdmin} toggleTheme={toggleTheme} isDarkMode={isDarkMode} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      
      {/* MOBILE EXACT ARCHITECTURE */}
      <div className="md:hidden flex flex-col h-[calc(100vh-52px)] w-full">
        {!activeNote ? (
          <DirectoryView condensed={false} />
        ) : (
          <NoteView note={activeNote} onBack={() => setActiveNote(null)} />
        )}
      </div>

      {/* DESKTOP EXACT ARCHITECTURE */}
      <div className="hidden md:flex h-[calc(100vh-52px)] w-full relative">
        {/* Left Side: Web Portal */}
        <div className="flex-1 lg:flex-none lg:w-[640px] xl:w-[60%] flex flex-col border-r border-theme-border relative overflow-hidden bg-theme-bg">
          <DirectoryView />
        </div>

        {/* Right Side: Mobile Simulator Mockup */}
        <div className="flex-1 bg-[#120206] flex items-center justify-center p-8 relative shrink-0">
          <div className="absolute bottom-8 right-8 text-[#f5ebe6] text-[10px] font-mono tracking-tighter opacity-40">
            MOBILE_SIMULATOR_V1 // SHARED_STATE_SYNC: TRUE
          </div>
          
          <div className="w-full max-w-[300px] flex flex-col relative z-10 self-center">
            <div className="text-center mb-6 w-full flex justify-between items-end px-2">
              <div className="text-left">
                <h3 className="font-heading font-black text-xl tracking-tight text-white/90 uppercase">Simulator</h3>
                <p className="text-[10px] font-bold tracking-widest text-[#7C2D12] uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Live PWA
                </p>
              </div>
              {activeNote && (
                 <button 
                   onClick={() => setActiveNote(null)} 
                   className="text-xs uppercase font-bold tracking-widest text-white/50 hover:text-white transition-colors"
                 >
                   Close PWA
                 </button>
              )}
            </div>

            {/* Smartphone Enclosure */}
            <div className="relative w-full h-[620px] bg-[#120206] border-[8px] border-theme-accent-start rounded-[48px] shadow-2xl flex flex-col overflow-hidden shrink-0">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#120206] rounded-b-2xl z-20" />

               {/* Screen Content Wrapper */}
               <div className="flex-1 bg-theme-bg rounded-[40px] overflow-hidden relative flex flex-col isolate">
                <div className="h-7 w-full bg-theme-bg shrink-0 flex items-center justify-between px-6 z-40 sticky top-0 border-b border-theme-border/10">
                   <span className="text-[10px] font-semibold tracking-wider text-theme-text">9:41</span>
                   <div className="flex items-center gap-1.5 opacity-80">
                     <div className="w-3 h-2.5 border border-theme-text rounded-[2px]" />
                     <div className="w-4 h-2.5 bg-theme-text/20 rounded-[2px] relative"><div className="absolute top-0.5 left-0.5 bottom-0.5 right-1 bg-theme-text rounded-sm" /></div>
                   </div>
                </div>

                {!activeNote ? (
                  <div className="flex-1 flex flex-col overflow-hidden bg-theme-bg">
                    <div className="px-5 pt-8 pb-3 bg-theme-bg border-b border-theme-border shrink-0 flex items-center justify-between shadow-sm z-10">
                       <h1 className="font-heading font-black text-lg bg-gradient-to-r from-theme-accent-start to-theme-accent-end bg-clip-text text-transparent transform scale-y-110">MUTU STUDY</h1>
                       <div className="w-7 h-7 rounded-full bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white flex items-center justify-center text-[10px] font-bold shadow-md ring-2 ring-theme-bg">SS</div>
                    </div>
                    <DirectoryView condensed={true} />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col max-h-full overflow-hidden isolate relative">
                     <NoteView note={activeNote} onBack={() => setActiveNote(null)} />
                  </div>
                )}
             </div>

             {/* Home Indicator bar */}
             <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/20 rounded-full z-50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
