import React, { useState, useEffect, useRef } from 'react';
import { Heart, Send, MessageCircle, Maximize2, X, Sparkles, Loader2, Bot } from 'lucide-react';
import { Note, Comment, LikeState } from '../types';
import { supabase } from '../supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface NoteViewProps {
  note: Note;
  onBack: () => void;
  isDarkMode?: boolean;
}

export function NoteView({ note, onBack, isDarkMode = false }: NoteViewProps) {
  const [fullNote, setFullNote] = useState<Note | null>(null);
  
  // AI State
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    const apiKey = localStorage.getItem('mutu_user_gemini_key');
    if (!apiKey) {
      setAiResponse('Error: Please configure your Gemini API Key in the profile menu.');
      return;
    }

    setIsAiLoading(true);
    setAiResponse('');

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `Context: This is a study module titled "${note.title}".
      The HTML content of the module is:
      ${fullNote?.html_code?.substring(0, 50000)}

      Question: ${aiQuery}`;
      
      const result = await model.generateContent(prompt);
      setAiResponse(result.response.text());
    } catch (e: any) {
      console.error(e);
      setAiResponse('AI Error: ' + (e?.message || 'Failed to fetch response.'));
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    const fetchNote = async () => {
      const { data, error } = await supabase.from('notes').select('*').eq('id', note.id).single();
      if (data && !error) setFullNote(data as Note);
    };
    fetchNote();
  }, [note.id]);

  // LocalStorage State for Likes
  const [likes, setLikes] = useState<LikeState>(() => {
    try {
      const stored = localStorage.getItem(`likes_${note.id}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse likes", e);
    }
    const isMock = note.id.startsWith('n');
    return { noteId: note.id, count: isMock ? Math.floor(Math.random() * 50) + 10 : 0, hasLiked: false };
  });

  // LocalStorage State for Comments
  const [comments, setComments] = useState<Comment[]>(() => {
    try {
      const stored = localStorage.getItem(`comments_${note.id}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse comments", e);
    }
    const isMock = note.id.startsWith('n');
    return isMock ? [
      {
        id: 'mock-comment-' + note.id,
        noteId: note.id,
        authorName: 'Sheikh Sadi',
        content: 'This module perfectly covers the core principles. Note the equation derivations carefully.',
        timestamp: new Date().toISOString()
      }
    ] : [];
  });

  const [newComment, setNewComment] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist Likes
  useEffect(() => {
    localStorage.setItem(`likes_${note.id}`, JSON.stringify(likes));
  }, [likes, note.id]);

  // Persist Comments
  useEffect(() => {
    localStorage.setItem(`comments_${note.id}`, JSON.stringify(comments));
  }, [comments, note.id]);

  const handleLike = () => {
    setLikes(prev => ({
      ...prev,
      count: prev.hasLiked ? Math.max(0, prev.count - 1) : prev.count + 1,
      hasLiked: !prev.hasLiked
    }));
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    const comment: Comment = {
      id: crypto.randomUUID(),
      noteId: note.id,
      authorName: 'Guest User',
      content: newComment.trim(),
      timestamp: new Date().toISOString()
    };
    
    setComments(prev => [comment, ...prev]);
    setNewComment('');
  };

  return (
    <div className={`flex flex-col h-full bg-theme-bg overflow-y-auto ${isFullscreen ? 'fixed inset-0 z-50 bg-[#fffdf9] dark:bg-[#120206] w-full min-h-screen' : ''}`} ref={scrollRef}>
      {/* Frame Container for actual note payload */}
      <div className={isFullscreen ? "w-full min-h-screen relative flex-1" : "w-full flex-1 relative flex-shrink-0"}>
        {isFullscreen ? (
          <button 
            onClick={() => setIsFullscreen(false)} 
            className="fixed top-4 right-4 z-50 bg-theme-card text-theme-text p-2 rounded-full shadow-md hover:bg-theme-muted transition-colors w-8 h-8 flex items-center justify-center border border-theme-border"
            title="Exit Fullscreen"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <div className="absolute top-2 right-2 z-20">
            <button 
              onClick={() => setIsFullscreen(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-theme-card/80 backdrop-blur border border-theme-border text-theme-text/80 shadow-sm hover:text-theme-accent-end transition-colors"
              title="Fullscreen Mode"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className={note.type === 'STATIC_A4' ? `max-w-[794px] w-full mx-auto p-0 m-0 relative h-full ${isDarkMode ? 'bg-white' : ''}` : "w-full h-full p-0 m-0 relative"}>
          {!fullNote?.html_code ? (
            <div className="flex items-center justify-center min-h-screen opacity-50">Loading material...</div>
          ) : fullNote.html_code.startsWith('data:application/pdf') ? (
            <object data={fullNote.html_code} type="application/pdf" className="w-full min-h-screen border-none block bg-white">
              <div className="p-10 text-center w-full mt-20 font-bold opacity-50">Browser unable to inline PDF.<br /><br /> <a href={fullNote.html_code} download={note.title + ".pdf"} className="underline text-theme-accent-end">Download PDF directly</a></div>
            </object>
          ) : (
            <iframe
              title={note.title}
              srcDoc={fullNote.html_code}
              className={`w-full min-h-screen border-none block ${isDarkMode && note.type === 'STATIC_A4' ? 'bg-white' : ''}`}
              sandbox="allow-scripts allow-same-origin"
            />
          )}
        </div>
      </div>

      {/* Community System (scrollable underneath) */}
      {!isFullscreen && (
        <div className="p-5 shrink-0 bg-theme-card border-t border-theme-border shadow-[0_-4px_20px_rgb(0,0,0,0.02)] isolate z-10 w-full mt-auto">
          <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-[25px] transition-all cursor-pointer font-semibold shadow-sm ${
              likes.hasLiked 
                ? 'bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white border-transparent' 
                : 'bg-theme-bg border border-theme-border text-theme-text/80 hover:bg-theme-muted'
            }`}
          >
            <Heart className={`w-4 h-4 ${likes.hasLiked ? 'fill-white' : ''}`} />
            <span>{likes.count} Likes</span>
          </button>
          <div className="flex items-center gap-2 text-theme-text/60 font-semibold px-2">
            <MessageCircle className="w-5 h-5" />
            <span>{comments.length} Comments</span>
          </div>
        </div>

        <div className="space-y-5 max-w-2xl mx-auto">
          <h3 className="font-heading font-black text-xl border-b border-theme-border pb-3">Community Discussion</h3>
          
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Share a thoughtful insight..." 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 bg-theme-card border border-theme-border rounded-[25px] px-4 text-sm h-10 outline-none focus:border-theme-accent-end transition-colors placeholder:text-theme-text/40 font-arabic"
            />
            <button 
              type="submit"
              disabled={!newComment.trim()}
              className="bg-theme-accent-start text-white p-0 w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 transition-all hover:bg-theme-accent-end"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>

          <div className="space-y-3 mt-6 pb-12">
            {comments.length === 0 ? (
              <p className="text-center text-theme-text/50 py-8 text-sm font-semibold tracking-wide uppercase">Be the first to start the discussion.</p>
            ) : (
              comments.map((c, i) => (
                <div key={c.id} className="flex gap-2 group" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="w-6 h-6 rounded-full bg-theme-accent-start text-[8px] flex flex-shrink-0 items-center justify-center text-white font-bold shadow-sm">
                    {c.authorName === 'Sheikh Sadi' ? 'SS' : c.authorName.charAt(0)}
                  </div>
                  <div className="bg-theme-card border border-theme-border p-3 rounded-[6px] text-xs flex-1 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-theme-text">{c.authorName}</p>
                      <span className="text-[9px] uppercase tracking-widest font-bold text-theme-text/40">
                        {new Date(c.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="opacity-80 leading-relaxed font-arabic text-[13px]">
                      {c.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      )}
      
      {/* Mutu AI Floating Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {aiPanelOpen && (
          <div className="w-80 h-96 mb-4 bg-theme-bg border border-theme-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-gradient-to-r from-theme-accent-start to-theme-accent-end p-3 flex justify-between items-center text-white">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Sparkles className="w-4 h-4" /> Mutu AI
              </div>
              <button onClick={() => setAiPanelOpen(false)} className="hover:opacity-80">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto w-full text-xs text-theme-text/80 space-y-4">
              {aiResponse ? (
                <div className="leading-relaxed whitespace-pre-wrap">{aiResponse}</div>
              ) : (
                <div className="opacity-50 text-center h-full flex items-center justify-center italic">
                  Ask me anything about this module!
                </div>
              )}
              {isAiLoading && (
                <div className="flex items-center gap-2 text-theme-accent-end">
                  <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                </div>
              )}
            </div>

            <form onSubmit={handleAiSubmit} className="p-3 border-t border-theme-border bg-theme-muted/20 flex gap-2">
              <input
                type="text"
                placeholder="Ask about this context..."
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                disabled={isAiLoading}
                className="flex-1 bg-theme-bg border border-theme-border rounded-md px-3 text-xs outline-none focus:border-theme-accent-end py-2 placeholder:text-theme-text/40"
              />
              <button 
                type="submit" 
                disabled={isAiLoading || !aiQuery.trim()}
                className="bg-theme-accent-end text-white px-3 py-2 rounded-md disabled:opacity-50 hover:opacity-90"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
        
        <button 
          onClick={() => setAiPanelOpen(!aiPanelOpen)}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
            aiPanelOpen 
              ? 'bg-theme-card text-theme-accent-end border border-theme-border' 
              : 'bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white hover:scale-105'
          }`}
          title="Mutu AI Assistance"
        >
          {aiPanelOpen ? <X className="w-5 h-5" /> : <Bot className="w-6 h-6" />}
        </button>
      </div>
      
    </div>
  );
}
