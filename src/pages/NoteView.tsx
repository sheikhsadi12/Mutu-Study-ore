import React, { useState, useEffect, useRef } from 'react';
import { Heart, Send, MessageCircle, Maximize2, X } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Note, Comment, LikeState } from '../types';
import { supabase } from '../supabaseClient';

interface NoteViewProps {
  note: Note;
  onBack: () => void;
  isDarkMode?: boolean;
}

export function NoteView({ note, onBack, isDarkMode = false }: NoteViewProps) {
  const [fullNote, setFullNote] = useState<Note | null>(null);
  
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
          <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
            {fullNote?.pdf_link && (
               <a 
                 href={fullNote.pdf_link}
                 target="_blank"
                 rel="noreferrer"
                 className="flex items-center justify-center h-8 px-3 rounded-full bg-theme-accent-start/90 backdrop-blur text-white shadow-sm hover:opacity-90 font-bold text-xs"
                 title="Open External Resource"
               >
                 Open Resource Link
               </a>
            )}
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
            <div className={`w-full min-h-screen px-6 py-12 md:px-12 md:py-16 prose prose-slate max-w-none ${isDarkMode && note.type === 'STATIC_A4' ? 'bg-[#fffdf9] text-slate-900 prose-invert-none' : 'dark:prose-invert'} markdown-body`}>
              <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {fullNote.html_code}
              </Markdown>
            </div>
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
    </div>
  );
}
