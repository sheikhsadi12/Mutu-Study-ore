import React, { useEffect, useState } from 'react';
import { Crown, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

interface EliteSuggestion {
  id: string;
  title: string;
  subject?: string;
  pdf_link?: string;
  html_code?: string;
}

export const EliteSuggestionBanner = ({ onSelectNote }: { onSelectNote: (note: any) => void }) => {
  const [suggestions, setSuggestions] = useState<EliteSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .like('subject', '[ELITE]%')
          .order('created_at', { ascending: false })
          .limit(3);
        
        if (error) {
          console.error("Error fetching elite suggestions:", error);
        } else if (data) {
          const parsedData = data.map(item => ({
            ...item,
            subject: item.subject?.replace('[ELITE] ', '')
          }));
          setSuggestions(parsedData);
        }
      } catch (err) {
        console.error("Failed to fetch elite suggestions", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSuggestions();
  }, []);

  if (loading) {
    return (
      <div className="w-full mb-0 bg-gradient-to-br from-[#2d1136] via-[#1a0524] to-[#11011a] rounded-xl p-6 border border-[#d4af37]/30 shadow-[0_0_20px_rgba(212,175,55,0.15)] flex justify-center items-center min-h-[150px]">
        <Loader2 className="w-6 h-6 text-[#d4af37] animate-spin" />
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="w-full relative overflow-hidden rounded-xl bg-gradient-to-br from-[#2d1136] via-[#1a0524] to-[#11011a] border border-[#d4af37]/30 shadow-[0_0_20px_rgba(212,175,55,0.15)] p-6 md:p-8 flex flex-col items-center justify-center text-center min-h-[200px]">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[#d4af37] opacity-5 rounded-full blur-3xl pointer-events-none"></div>
        
        <Crown className="w-10 h-10 text-[#d4af37] mb-3 opacity-50" strokeWidth={2} />
        <h2 className="bg-clip-text text-transparent bg-gradient-to-r from-[#d4af37]/70 via-[#fff4cc]/70 to-[#b5852a]/70 font-bold text-xl md:text-2xl tracking-tight mb-2">
          Last Night Elite Suggestion
        </h2>
        <p className="text-[#dcd0c0]/60 font-medium text-sm">
          No elite suggestions are currently available. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full mb-0 relative overflow-hidden rounded-xl bg-gradient-to-br from-[#2d1136] via-[#1a0524] to-[#11011a] border border-[#d4af37]/30 shadow-[0_0_20px_rgba(212,175,55,0.15)] p-4 md:p-5">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-48 h-48 bg-[#d4af37] opacity-5 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-6 h-6 text-[#d4af37]" strokeWidth={2.5} />
            <h2 className="bg-clip-text text-transparent bg-gradient-to-r from-[#d4af37] via-[#fff4cc] to-[#b5852a] font-bold text-lg md:text-xl tracking-tight">
              Last Night Elite Suggestion
            </h2>
          </div>
          <p className="text-[#dcd0c0] font-medium text-xs">
            Alim 2026 - Be Prepared, Be Confident
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 relative z-10">
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="bg-gradient-to-br from-[#2d1136] via-[#1a0524] to-[#11011a] border border-[#d4af37]/30 rounded-lg p-3 flex flex-col justify-between backdrop-blur-sm">
             <div>
                {suggestion.subject && (
                  <span className="text-[9px] font-bold text-[#d4af37] uppercase tracking-widest mb-1 block">
                    {suggestion.subject}
                  </span>
                )}
                <h3 className="text-white font-bold text-sm mb-2 line-clamp-2">
                  {suggestion.title}
                </h3>
             </div>
             
             <button 
                onClick={() => onSelectNote(null)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-gradient-to-r from-[#b5852a] to-[#d4af37] text-[#1a0524] text-xs font-bold rounded-md hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-sm"
             >
               View Elite Suggestion
               <ArrowRight className="w-3 h-3" />
             </button>
          </div>
        ))}
      </div>
    </div>
  );
};
