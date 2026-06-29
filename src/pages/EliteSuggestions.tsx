import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { NoteView } from './NoteView';
import { Note } from '../types';
import { FileText, LayoutGrid, Clock, BookOpen, Crown } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../supabaseClient';

export function EliteSuggestions({ toggleTheme, isDarkMode, searchQuery, setSearchQuery }: any) {
  const navigate = useNavigate();
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const eliteNoteRaw = localStorage.getItem('elite_target_note');
    if (eliteNoteRaw) {
      try {
        const eliteNote = JSON.parse(eliteNoteRaw);
        setActiveNote(eliteNote);
        localStorage.removeItem('elite_target_note');
      } catch (e) {
        console.error("Failed to parse elite note", e);
      }
    }
  }, []);

  useEffect(() => {
    const fetchEliteNotes = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .like('subject', '[ELITE]%')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching elite notes', error);
      } else if (data) {
        // Strip [ELITE] tag for display
        const parsedData = data.map(n => ({
          ...n,
          subject: n.subject?.replace('[ELITE] ', '')
        }));
        setNotes(parsedData as Note[]);
      }
      setIsLoading(false);
    };
    
    fetchEliteNotes();
  }, []);

  const filteredNotes = notes.filter((n: Note) => {
    const searchMatch = searchQuery === '' || 
      (n.title && n.title.toLowerCase().includes(searchQuery.toLowerCase())) || 
      (n.description && n.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return searchMatch;
  });

  const EliteDirectoryView = () => (
    <div className="overflow-y-auto h-full flex-1 p-4 sm:p-6 lg:p-10 bg-theme-bg">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center text-center mb-6 bg-gradient-to-br from-[#2d1136] via-[#1a0524] to-[#11011a] rounded-xl p-4 md:p-6 border border-[#d4af37]/30 shadow-[0_0_20px_rgba(212,175,55,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#d4af37] opacity-5 rounded-full blur-3xl pointer-events-none"></div>
          <Crown className="w-8 h-8 text-[#d4af37] mb-2 drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]" strokeWidth={2} />
          <h2 className="bg-clip-text text-transparent bg-gradient-to-r from-[#d4af37] via-[#fff4cc] to-[#b5852a] font-bold text-xl md:text-2xl tracking-tight mb-1">
            Elite Suggestions
          </h2>
          <p className="text-[#dcd0c0]/80 font-medium text-xs md:text-sm max-w-lg">
            Exclusive, high-priority last night suggestions specially curated for the Alim 2026 batch.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-base animate-pulse h-full">
                 <div className="p-4 md:p-6 flex flex-col h-full bg-theme-card isolate relative">
                   <div className="flex justify-between items-start mb-3 md:mb-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-theme-muted rounded-[14px]"></div>
                      <div className="w-16 h-5 bg-theme-muted rounded-full"></div>
                   </div>
                   <div className="w-3/4 h-6 bg-theme-muted rounded mb-2"></div>
                   <div className="w-full h-4 bg-theme-muted rounded mb-1.5 flex-1"></div>
                 </div>
              </div>
            ))}
          </div>
        ) : filteredNotes.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
             <div className="w-20 h-20 mb-6 rounded-full bg-theme-muted flex items-center justify-center shadow-inner border border-[#d4af37]/20 text-[#d4af37]/60">
               <Crown className="w-10 h-10" />
             </div>
             <h3 className="font-heading font-black text-xl text-[#d4af37] mb-2">No Elite Suggestions Yet</h3>
             <p className="text-sm font-semibold opacity-70 max-w-sm mx-auto leading-relaxed text-theme-text/80">
               Check back later for exclusive material and exam suggestions.
             </p>
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
             {filteredNotes.map((note: Note) => (
                <div 
                  key={note.id}
                  onClick={() => setActiveNote(note)}
                  className="bg-gradient-to-br from-[#2d1136] via-[#1a0524] to-[#11011a] border border-[#d4af37]/30 rounded-xl group cursor-pointer transition-all hover:shadow-[0_8px_30px_rgba(212,175,55,0.15)] md:hover:-translate-y-1 h-full flex flex-col relative overflow-hidden"
                >
                  {/* Inner glow effect for elite cards */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#d4af37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="p-4 md:p-6 flex flex-col h-full isolate relative text-left">
                    <div className="flex w-full justify-between items-start mb-4">
                      <div className="p-2.5 md:p-3 bg-[#1a0524]/60 border border-[#d4af37]/40 rounded-xl text-[#d4af37] group-hover:scale-110 group-hover:-translate-y-0.5 transition-all shadow-[0_2px_10px_rgba(212,175,55,0.1)]">
                        {note.type === 'STATIC_A4' ? <FileText className="w-5 h-5"/> : <LayoutGrid className="w-5 h-5"/>}
                      </div>
                      {note.subject && (
                        <span className="text-[9px] md:text-[10px] font-bold tracking-wider uppercase bg-[#d4af37]/10 border border-[#d4af37]/30 px-2 py-0.5 md:py-1 rounded-md text-[#d4af37] mt-1 shadow-[0_0_8px_rgba(212,175,55,0.2)]">
                          {note.subject}
                        </span>
                      )}
                    </div>
                    <h3 className="font-heading font-bold text-base md:text-lg mb-2 text-[#fff4cc] group-hover:text-[#d4af37] transition-colors line-clamp-2 leading-tight">
                      {note.title}
                    </h3>
                    <p className="text-xs md:text-sm text-[#dcd0c0]/70 mb-5 flex-1 font-arabic line-clamp-2 leading-relaxed">
                      {note.description}
                    </p>
                    <div className="flex items-center justify-between text-[10px] md:text-xs text-[#dcd0c0]/50 font-bold uppercase tracking-wider pt-3 border-t border-[#d4af37]/20 w-full mt-auto">
                      <span className="group-hover:text-[#d4af37]/80 transition-colors">Elite Content</span>
                      <div className="flex items-center gap-1.5 group-hover:text-[#d4af37]/80 transition-colors">
                        <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        {note.created_at ? new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </div>
                    </div>
                  </div>
                </div>
             ))}
           </div>
        )}
      </div>
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
             window.history.back();
          } else {
             navigate('/');
          }
        }}
      />
      
      <div className="flex flex-col h-[calc(100vh-48px)] w-full relative">
        {!activeNote ? (
          <EliteDirectoryView />
        ) : (
          <NoteView note={activeNote} onBack={() => setActiveNote(null)} isDarkMode={isDarkMode} />
        )}
      </div>
    </div>
  );
}
