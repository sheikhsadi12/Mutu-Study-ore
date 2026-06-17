import React, { useState, useEffect } from 'react';
import { Sparkles, X, Send, Bot, Loader2, Plus, FileText, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Note } from '../types';
import { cn } from '../lib/utils';

interface ChatComponentProps {
  currentNote?: Note | null;
}

export function ChatComponent({ currentNote }: ChatComponentProps) {
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const systemKey = import.meta.env.VITE_GEMINI_API_KEY;
  const [localApiKey, setLocalApiKey] = useState(() => localStorage.getItem('mutu_user_gemini_key') || '');
  const [showSetupGuide, setShowSetupGuide] = useState(!systemKey && !localApiKey);
  
  // Attachments State
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [attachedNoteIds, setAttachedNoteIds] = useState<Set<string>>(new Set(currentNote ? [currentNote.id] : []));

  useEffect(() => {
    // Sync current note to attached if it changes
    if (currentNote) {
      setAttachedNoteIds(prev => new Set(prev).add(currentNote.id));
    }
  }, [currentNote]);

  useEffect(() => {
    // Fetch basic metadata for the attachment menu
    const fetchNotesList = async () => {
      const { data } = await supabase.from('notes').select('id, title, subject');
      if (data) {
        setAllNotes(data as Note[]);
      }
    };
    if (allNotes.length === 0) {
      fetchNotesList();
    }
  }, [allNotes.length]);

  const saveApiKey = (key: string) => {
    if (!key.trim()) return;
    setLocalApiKey(key);
    localStorage.setItem('mutu_user_gemini_key', key);
    setShowSetupGuide(false);
  };

  const toggleAttachment = (noteId: string) => {
    setAttachedNoteIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    const apiKey = systemKey || localApiKey;
    
    if (!apiKey) {
      setShowSetupGuide(true);
      return;
    }

    setIsAiLoading(true);
    setAiResponse('');
    setShowAttachMenu(false);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      let contextText = "";
      if (attachedNoteIds.size > 0) {
        // Fetch full HTML content for just the attached notes securely here
        const idsArray = Array.from(attachedNoteIds);
        const { data: attachedNotesData, error } = await supabase.from('notes').select('title, html_code').in('id', idsArray);
        
        if (attachedNotesData) {
           contextText = attachedNotesData.map(n => `--- Module: ${n.title} ---\n${n.html_code?.substring(0, 5000)}`).join('\n\n');
        }
      }

      let prompt = "";
      if (contextText) {
         prompt = `Context from attached notes:\n${contextText}\n\nUser Question: ${aiQuery}\n\nPlease answer based strictly on the provided notes.`;
      } else {
         prompt = `User Question: ${aiQuery}\n\nPlease act as a helpful and knowledgeable general-purpose study assistant.`;
      }
      
      const result = await model.generateContent(prompt);
      setAiResponse(result.response.text());
    } catch (e: any) {
      console.error(e);
      if (e?.message?.includes('API key not valid') || e?.message?.includes('quota') || e?.status === 403 || e?.status === 429) {
          setShowSetupGuide(true);
      } else {
          setAiResponse('AI Error: ' + (e?.message || 'Failed to fetch response.'));
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-theme-bg flex flex-col overflow-hidden relative rounded-b-[20px] md:rounded-t-[20px]">
      {showSetupGuide ? (
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-4 sm:p-6 bg-theme-bg">
          <div className="w-full max-w-md bg-theme-card border border-theme-border/60 rounded-[20px] p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-theme-accent-start to-theme-accent-end"></div>
            
            <div className="flex items-center gap-3 text-theme-accent-end mb-6">
              <Sparkles className="w-8 h-8" />
              <h3 className="font-heading font-black text-[22px] tracking-tight text-theme-text">Connect Your AI</h3>
            </div>
            
            <div className="space-y-4 mb-8 text-[15px] leading-relaxed text-theme-text/80 font-sans">
              <p>
                <span className="font-bold text-theme-accent-start">ধাপ ১:</span> গুগল এআই স্টুডিও (Google AI Studio) লিংকে ক্লিক করুন।
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="mt-3 flex items-center justify-center gap-2 bg-theme-muted border border-theme-border/80 hover:bg-theme-muted/80 hover:border-theme-border text-theme-text font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-theme-accent-end" />
                  Google AI Studio
                </a>
              </p>
              <p><span className="font-bold text-theme-accent-start">ধাপ ২:</span> আপনার গুগল অ্যাকাউন্ট দিয়ে লগইন করুন।</p>
              <p><span className="font-bold text-theme-accent-start">ধাপ ৩:</span> 'Create API key in new project' বাটনে ক্লিক করে কি (Key) টি কপি করুন।</p>
              <p><span className="font-bold text-theme-accent-start">ধাপ ৪:</span> নিচে বক্সে কি (Key) টি পেস্ট করে 'Save' করুন।</p>
            </div>

            <div className="space-y-4">
              <input
                type="password"
                placeholder="Paste your API Key here..."
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border/80 rounded-xl px-4 py-3.5 outline-none focus:border-theme-accent-end focus:ring-1 focus:ring-theme-accent-end transition-all shadow-inner text-[15px]"
              />
              <button 
                onClick={() => saveApiKey(localApiKey)}
                className="w-full bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[15px]"
              >
                <CheckCircle2 className="w-5 h-5" /> Save API Key
              </button>
              {localApiKey && (
                 <button onClick={() => setShowSetupGuide(false)} className="w-full text-center text-sm text-theme-text/50 hover:text-theme-text/80 py-2">
                   Cancel
                 </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 p-4 overflow-y-auto w-full text-sm text-theme-text/80 space-y-4">
            {aiResponse ? (
              <div className="leading-relaxed whitespace-pre-wrap font-sans">{aiResponse}</div>
            ) : (
              <div className="opacity-60 text-center h-full flex flex-col items-center justify-center italic gap-3">
                <Bot className="w-12 h-12 opacity-50" />
                <p>Ask a question based on your materials.<br/>Attach specific notes to guide my context.</p>
              </div>
            )}
            {isAiLoading && (
              <div className="flex items-center gap-2 text-theme-accent-end font-bold animate-pulse">
                <Loader2 className="w-5 h-5 animate-spin" /> Analyzing context...
              </div>
            )}
          </div>

          {/* Attachments Menu Overlay */}
          {showAttachMenu && (
            <div className="absolute bottom-[68px] left-0 w-full bg-theme-card border-t border-theme-border max-h-48 overflow-y-auto shadow-[0_-10px_30px_rgba(0,0,0,0.1)] z-10 animate-in slide-in-from-bottom-2">
              <div className="p-2 border-b border-theme-border/50 bg-theme-muted/30 sticky top-0 flex justify-between items-center backdrop-blur-sm">
                <span className="text-[10px] font-bold uppercase tracking-widest text-theme-text/60 ml-2">Available Materials</span>
                <button onClick={() => setShowAttachMenu(false)} className="text-theme-text/40 hover:text-theme-text">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2 space-y-1">
                {allNotes.map(n => (
                  <button 
                    key={n.id}
                    onClick={() => toggleAttachment(n.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors",
                      attachedNoteIds.has(n.id) ? "bg-theme-accent-start/10 text-theme-accent-start font-bold" : "hover:bg-theme-muted text-theme-text/70"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{n.title}</span>
                    </div>
                    {attachedNoteIds.has(n.id) && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  </button>
                ))}
                {allNotes.length === 0 && (
                   <div className="p-3 text-center text-xs text-theme-text/50">No materials available.</div>
                )}
              </div>
            </div>
          )}

           {/* Selected Attachments Indicators */}
           {attachedNoteIds.size > 0 && !showAttachMenu && (
              <div className="px-3 py-2 border-t border-theme-border bg-theme-muted/10 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                <span className="text-[10px] font-bold text-theme-text/40 uppercase shrink-0">Context:</span>
                {Array.from(attachedNoteIds).map(id => {
                  const n = allNotes.find(an => an.id === id);
                  if (!n) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-theme-border text-[10px] whitespace-nowrap text-theme-text/80 font-medium">
                      <FileText className="w-3 h-3" />
                      {n.title.substring(0, 15)}{n.title.length > 15 ? '...' : ''}
                      <button onClick={() => toggleAttachment(id)} className="ml-1 hover:text-red-500 rounded-full p-0.5"><X className="w-3 h-3"/></button>
                    </span>
                  );
                })}
              </div>
           )}

          <form onSubmit={handleAiSubmit} className="p-3 border-t border-theme-border bg-theme-bg flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className={`p-2 rounded-xl transition-all border shrink-0 ${showAttachMenu || attachedNoteIds.size > 0 ? 'bg-theme-accent-start text-white border-theme-accent-start shadow-sm' : 'bg-theme-muted/50 text-theme-text/60 border-theme-border/50 hover:bg-theme-border hover:text-theme-text'}`}
              title="Attach Study Material"
            >
              <Plus className="w-5 h-5" />
            </button>
            <input
              type="text"
              placeholder="Ask about your notes..."
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              disabled={isAiLoading}
              className="flex-1 bg-theme-muted/20 border border-theme-border/80 rounded-xl px-4 text-sm outline-none focus:border-theme-accent-end py-2.5 placeholder:text-theme-text/40 transition-colors"
            />
            <button 
              type="submit" 
              disabled={isAiLoading || !aiQuery.trim()}
              className="bg-theme-accent-end text-white p-2.5 rounded-xl disabled:opacity-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}

