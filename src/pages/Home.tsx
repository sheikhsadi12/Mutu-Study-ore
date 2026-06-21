import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { NoteView } from './NoteView';
import { Note } from '../types';
import { FileText, LayoutGrid, Clock, ChevronRight, Lock, BookOpen, List } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../supabaseClient';

export function Home({ toggleTheme, isDarkMode, searchQuery, setSearchQuery }: any) {
  const navigate = useNavigate();
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [filter, setFilter] = useState('All');
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const fetchNotes = async () => {
      // 1. Initial Local Cache Load (Stale-While-Revalidate)
      const cached = localStorage.getItem('mutu_cached_notes');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setNotes(parsed);
            setIsLoading(false); // Instantly show UI if we have cache
          }
        } catch (e) {
          console.warn("Error parsing cached notes", e);
        }
      }

      // 2. Fetch Fresh Data Silently
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        // Wait for session to be fully loaded if it's currently missing
        await new Promise(resolve => {
           const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
              if (session) {
                 resolve(null);
                 authListener.subscription.unsubscribe();
              }
           });
           setTimeout(() => resolve(null), 2000); // 2 second timeout fallback
        });
      }

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .neq('subject', 'SYSTEM_CONFIG')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching notes', error);
      } else if (data) {
        setNotes(data as Note[]);
        localStorage.setItem('mutu_cached_notes', JSON.stringify(data));
      }
      setIsLoading(false);
    };
    
    fetchNotes();
  }, []);

  const filteredNotes = notes.filter((n: Note) => {
    if (n.subject === 'SYSTEM_CONFIG') return false;
    const matchesSubject = filter === 'All' || n.subject === filter;
    const searchMatch = searchQuery === '' || 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && searchMatch;
  });

  const subjects = ['All', ...Array.from(new Set(notes.map((n: Note) => n.subject)))];

  // Directory UI component shared for Mobile View and Desktop Left Panel
  const DirectoryView = ({ condensed = false }: { condensed?: boolean }) => (
    <div className={cn("overflow-y-auto h-full flex-1", condensed ? "p-3 md:p-4 space-y-3 bg-theme-muted/20" : "p-4 sm:p-6 lg:p-10 bg-theme-muted/10")}>
      {!condensed && (
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col mb-1 md:mb-1 gap-1 border-b border-theme-border/50 pb-1">
            <div className="flex justify-between items-center">
              <h2 className="text-theme-text/70 font-bold uppercase tracking-widest text-xs md:text-sm">Knowledge Base Modules</h2>
              <div className="flex items-center gap-1 bg-theme-muted/30 border border-theme-border/50 rounded-full p-1">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn("p-1.5 rounded-full transition-colors", viewMode === 'grid' ? "bg-theme-bg shadow-sm text-theme-accent-end" : "text-theme-text/50 hover:text-theme-text/80")}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn("p-1.5 rounded-full transition-colors", viewMode === 'list' ? "bg-theme-bg shadow-sm text-theme-accent-end" : "text-theme-text/50 hover:text-theme-text/80")}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              </div>
            </div>
            <div className="flex overflow-x-auto flex-nowrap items-center gap-2 pb-1 hide-scrollbar">
              {subjects.map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "whitespace-nowrap flex-shrink-0 px-3 py-1.5 md:px-4 text-[10px] md:text-xs rounded-[25px] font-bold transition-all border shadow-sm cursor-pointer",
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

          {isLoading && notes.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="card-base animate-pulse h-full">
                   <div className="p-4 md:p-6 flex flex-col h-full bg-theme-card isolate relative">
                     <div className="flex justify-between items-start mb-3 md:mb-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-theme-muted rounded-[14px]"></div>
                        <div className="w-16 h-5 bg-theme-muted rounded-full"></div>
                     </div>
                     <div className="w-3/4 h-6 bg-theme-muted rounded mb-2"></div>
                     <div className="w-full h-4 bg-theme-muted rounded mb-1.5 flex-1"></div>
                     <div className="w-5/6 h-4 bg-theme-muted rounded mb-1.5"></div>
                     <div className="flex items-center justify-between pt-3 md:pt-4 border-t border-theme-border/40 mt-4 md:mt-6">
                       <div className="w-20 h-3 bg-theme-muted rounded"></div>
                       <div className="w-12 h-3 bg-theme-muted rounded"></div>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
               <div className="w-20 h-20 mb-6 rounded-full bg-theme-muted flex items-center justify-center shadow-inner border border-theme-border/50 text-theme-accent-end/60">
                 <BookOpen className="w-10 h-10" />
               </div>
               <h3 className="font-heading font-black text-xl text-theme-accent-end mb-2">No Dynamic Materials Found</h3>
               <p className="text-sm font-semibold opacity-70 max-w-sm mx-auto leading-relaxed text-theme-text/80">
                 No dynamic materials found. Add your first note to see the magic!
               </p>
             </div>
          ) : (
             <div className={cn("grid gap-3 md:gap-4", viewMode === 'grid' ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid-cols-1")}>
               {filteredNotes.map((note: Note) => (
                 viewMode === 'grid' ? (
                  <div 
                    key={note.id}
                    onClick={() => setActiveNote(note)}
                    className={cn(
                      "card-base relative group cursor-pointer transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] md:hover:-translate-y-1 h-full",
                      activeNote?.id === note.id ? "ring-2 ring-theme-accent-end ring-offset-2 ring-offset-theme-bg" : ""
                    )}
                  >
                    <div className="card-top-accent !h-0.5 opacity-50" />
                    <div className="p-3 md:p-4 flex flex-col h-full bg-theme-card isolate relative text-left">
                      <div className="flex w-full justify-between items-start mb-4">
                        <div className="p-2.5 md:p-3 bg-theme-muted/50 border border-theme-border/60 rounded-xl md:rounded-2xl text-theme-accent-end group-hover:scale-110 group-hover:-translate-y-0.5 transition-all shadow-[0_2px_10px_rgb(0,0,0,0.03)]">
                          {note.type === 'STATIC_A4' ? <FileText className="w-5 h-5 md:w-6 md:h-6"/> : <LayoutGrid className="w-5 h-5 md:w-6 md:h-6"/>}
                        </div>
                        <span className="text-[9px] md:text-[10px] font-bold tracking-wider uppercase bg-theme-border/40 px-2 py-0.5 md:py-1 rounded-md text-theme-accent-end/90 mt-1">
                          {note.subject}
                        </span>
                      </div>
                      <h3 className="font-heading font-bold text-base md:text-lg mb-2 group-hover:text-theme-accent-end transition-colors line-clamp-2 leading-tight">{note.title}</h3>
                      <p className="text-xs md:text-sm text-theme-text/70 mb-5 flex-1 font-arabic line-clamp-2 leading-relaxed">
                        {note.description}
                      </p>
                      <div className="flex items-center justify-between text-[10px] md:text-xs text-theme-text/50 font-bold uppercase tracking-wider pt-3 border-t border-theme-border/50 w-full mt-auto">
                        <span className="group-hover:text-theme-text/70 transition-colors">{note.type === 'STATIC_A4' ? 'DOCUMENT' : 'PLATFORM'}</span>
                        <div className="flex items-center gap-1.5 group-hover:text-theme-text/70 transition-colors">
                          <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          {note.created_at ? new Date(note.created_at).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: '2-digit' }) : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                 ) : (
                  <div 
                    key={note.id}
                    onClick={() => setActiveNote(note)}
                    className={cn(
                      "group cursor-pointer transition-all hover:bg-theme-muted/20 border border-theme-border/30 hover:border-theme-border/60 rounded-xl flex items-center py-2.5 px-3 md:py-3.5 md:px-4 gap-4 bg-theme-card relative shadow-sm hover:shadow-md text-left",
                      activeNote?.id === note.id ? "ring-2 ring-theme-accent-end bg-theme-muted/30" : ""
                    )}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-accent-end/20 group-hover:bg-theme-accent-end transition-colors" />
                    <div className="p-2.5 md:p-3 bg-theme-muted/50 border border-theme-border/60 rounded-xl md:rounded-2xl text-theme-accent-end group-hover:scale-110 group-hover:-translate-y-0.5 transition-all shrink-0 shadow-sm ml-1 md:ml-2">
                      {note.type === 'STATIC_A4' ? <FileText className="w-5 h-5 md:w-6 md:h-6"/> : <LayoutGrid className="w-5 h-5 md:w-6 md:h-6"/>}
                    </div>
                    <div className="flex-1 min-w-0 pl-2 pr-4 border-r border-theme-border/50 py-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[9px] md:text-[10px] font-black tracking-widest uppercase bg-theme-border/30 px-2 py-0.5 md:py-1 rounded text-theme-accent-end/90 shrink-0 hidden sm:inline-block">
                          {note.subject}
                        </span>
                        <h3 className="font-heading font-bold text-sm md:text-base group-hover:text-theme-accent-end transition-colors truncate">{note.title}</h3>
                      </div>
                      <p className="text-xs md:text-sm text-theme-text/70 font-arabic truncate mt-1">
                        {note.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-center shrink-0 w-24 md:w-28 pl-4 pr-1 md:pr-2">
                      <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-theme-text/50 mb-1.5 group-hover:text-theme-text/70 transition-colors">
                        {note.type === 'STATIC_A4' ? 'DOCUMENT' : 'PLATFORM'}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-theme-text/60 font-semibold group-hover:text-theme-text/80 transition-colors">
                        <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        {note.created_at ? new Date(note.created_at).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: '2-digit' }) : ''}
                      </div>
                    </div>
                  </div>
                 )
            ))}
          </div>
          )}
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
                  {note.subject} <span className="w-1 h-1 rounded-full bg-theme-border"></span> {note.type === 'STATIC_A4' ? 'DOC' : 'APP'}
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
        toggleTheme={toggleTheme} 
        isDarkMode={isDarkMode} 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery}
        activeNote={activeNote}
        onBack={() => {
          if (activeNote) {
             window.history.back(); // Triggers useModalBack listener in NoteView
          } else {
             navigate('/');
          }
        }}
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
