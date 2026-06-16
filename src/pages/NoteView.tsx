import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Printer, Heart, Send, MessageCircle } from 'lucide-react';
import { Note, Comment, LikeState } from '../types';

interface NoteViewProps {
  note: Note;
  onBack: () => void;
}

export function NoteView({ note, onBack }: NoteViewProps) {
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
        id: crypto.randomUUID(),
        noteId: note.id,
        authorName: 'Sheikh Sadi',
        content: 'This module perfectly covers the core principles. Note the equation derivations carefully.',
        timestamp: new Date().toISOString()
      }
    ] : [];
  });

  const [newComment, setNewComment] = useState('');
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

  // Setup basic html layout to inject into iframe for raw HTML rendering
  const iframeContent = `
    <!DOCTYPE html>
    <html class="${note.type === 'STATIC_A4' ? 'bg-[#f0e6dd]' : 'bg-white'}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Scheherazade+New:wght@400;500;600;700&display=swap');
          body { 
            font-family: 'Hind Siliguri', sans-serif; 
            color: #2d1610; 
            margin: 0; 
            line-height: 1.6;
            ${note.type === 'STATIC_A4' ? 'padding: 24px; display: flex; justify-content: center;' : 'padding: 0; min-height: 100vh; background: #fffdf9;'}
          }
          * { box-sizing: border-box; }
          .a4-container { 
            background: white; 
            width: 100%; 
            max-width: 800px; 
            min-height: 100vh;
            padding: 48px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.05); 
            border-radius: 4px;
            border: 1px solid #e8c3a2;
          }
          h1, h2, h3 { font-family: 'Playfair Display', serif; color: #4C0519; margin-top: 0; }
          .arabic-text { font-family: 'Scheherazade New', serif; font-size: 1.1em; line-height: normal; }
          .hero { text-align: center; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 2px solid #e8c3a2; }
          @media print {
            body { padding: 0; background: white; }
            .a4-container { box-shadow: none; border: none; padding: 0; max-width: none; }
          }
        </style>
      </head>
      <body>
        <div class="${note.type === 'STATIC_A4' ? 'a4-container' : 'full-container'}">
          <div class="hero">
            <h1>${note.title}</h1>
            <p style="color: #7C2D12; text-transform: uppercase; font-size: 0.85em; letter-spacing: 1px;">${note.category} • Module Reference</p>
          </div>
          <div>${note.sourceUrl}</div>
        </div>
      </body>
    </html>
  `;

  return (
    <div className="flex flex-col h-full bg-theme-bg overflow-y-auto" ref={scrollRef}>
      <header className="flex items-center justify-between p-3 border-b border-theme-border sticky top-0 bg-theme-bg/95 backdrop-blur z-20 shrink-0 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-1 rounded-full hover:bg-theme-muted transition-colors text-theme-text/80">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-heading font-semibold text-[15px] truncate flex-1 px-3 text-center text-theme-accent-end tracking-tight">
          {note.title}
        </h2>
        {note.type === 'STATIC_A4' ? (
          <button 
            onClick={() => {/* Mock print via window in an actual app, here we just prevent default error */ alert('Print triggered! (Simulation only)')}} 
            className="p-2 -mr-1 rounded-full hover:bg-theme-muted transition-colors text-theme-accent-end dark:text-theme-text" 
            title="Print to PDF"
          >
            <Printer className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-9" /> 
        )}
      </header>

      {/* Frame Container for actual note payload */}
      <div className="w-full relative flex-shrink-0" style={{ height: note.type === 'STATIC_A4' ? '65vh' : '85vh' }}>
        {note.sourceUrl.startsWith('data:application/pdf') ? (
          <object data={note.sourceUrl} type="application/pdf" className="w-full h-full border-0 absolute top-0 left-0 z-10 block bg-white">
            <div className="p-10 text-center w-full mt-20 font-bold opacity-50">Browser unable to inline PDF.<br /><br /> <a href={note.sourceUrl} download={note.title + ".pdf"} className="underline text-theme-accent-end">Download PDF directly</a></div>
          </object>
        ) : (
          <iframe
            title={note.title}
            srcDoc={iframeContent}
            className="w-full h-full border-0 shadow-inner bg-theme-muted/20 absolute top-0 left-0 z-10 block"
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>

      {/* Community System (scrollable underneath) */}
      <div className="p-5 shrink-0 bg-theme-card border-t-4 border-theme-border shadow-[0_-10px_30px_rgba(0,0,0,0.02)] isolate z-10 flex-1">
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
    </div>
  );
}
