import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Bot, Loader2, Plus, FileText, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Note } from '../types';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface ChatComponentProps {
  currentNote?: Note | null;
}

interface AiMessage {
  role: 'user' | 'model';
  content: string;
}

export function ChatComponent({ currentNote }: ChatComponentProps) {
  const [aiQuery, setAiQuery] = useState('');
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const systemKey = import.meta.env.VITE_GEMINI_API_KEY;
  const [localApiKey, setLocalApiKey] = useState(() => localStorage.getItem('mutu_user_gemini_key') || '');
  const [showSetupGuide, setShowSetupGuide] = useState(!systemKey && !localApiKey);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiLoading]);

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
    if (!aiQuery.trim() || isAiLoading) return;

    const apiKey = systemKey || localApiKey;
    
    if (!apiKey) {
      setShowSetupGuide(true);
      return;
    }

    const currentQuery = aiQuery.trim();
    setAiQuery('');
    setMessages(prev => [...prev, { role: 'user', content: currentQuery }, { role: 'model', content: '' }]);
    setIsAiLoading(true);
    setShowAttachMenu(false);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      
      let contextText = "";
      if (attachedNoteIds.size > 0 && messages.length === 0) {
        // Fetch full HTML content for just the attached notes securely here (only inject on first message to save tokens)
        const idsArray = Array.from(attachedNoteIds);
        const { data: attachedNotesData } = await supabase.from('notes').select('title, html_code').in('id', idsArray);
        
        if (attachedNotesData) {
           contextText = attachedNotesData.map(n => `--- Module: ${n.title} ---\n${n.html_code?.substring(0, 5000)}`).join('\n\n');
        }
      }

      const systemInstruction = contextText 
        ? `Context from attached notes:\n${contextText}\n\nPlease act as a helpful and knowledgeable general-purpose study assistant, answering strictly based on the provided notes.` 
        : `Please act as a helpful and knowledgeable general-purpose study assistant.`;

      const model = genAI.getGenerativeModel({ 
        model: "gemini-3.5-flash",
        systemInstruction
      });
      
      const chat = model.startChat({
        history: messages.map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }))
      });
      
      const result = await chat.sendMessageStream(currentQuery);
      let isFirstChunk = true;

      for await (const chunk of result.stream) {
        if (isFirstChunk) {
          setIsAiLoading(false);
          isFirstChunk = false;
        }
        const chunkText = chunk.text();
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content += chunkText;
          return newMessages;
        });
      }
    } catch (e: any) {
      console.error(e);
      if (e?.message?.includes('API key not valid') || e?.message?.includes('quota') || e?.status === 403 || e?.status === 429) {
          setShowSetupGuide(true);
      } else {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = 'AI Error: ' + (e?.message || 'Failed to fetch response.');
            return newMessages;
          });
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
          <div className="flex-1 p-4 overflow-y-auto w-full text-sm text-theme-text/80 space-y-6">
            {messages.length === 0 ? (
              <div className="opacity-60 text-center h-full flex flex-col items-center justify-center italic gap-3">
                <Bot className="w-12 h-12 opacity-50" />
                <p>Ask a question based on your materials.<br/>Attach specific notes to guide my context.</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                if (msg.role === 'model' && !msg.content && isAiLoading) return null; // hide empty bot message until streaming starts
                return (
                 <div key={idx} className={cn("flex flex-col w-full relative", msg.role === 'user' ? "items-end" : "items-start")}>
                    <div className={cn("flex items-end gap-1.5 w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                       <div 
                         className={cn(
                           "w-fit max-w-[90%] md:max-w-[85%] px-4 py-3 break-words relative transform-gpu",
                           msg.role === 'user' 
                             ? "bg-theme-accent-start text-white shadow-sm rounded-[24px] rounded-br-[8px]" 
                             : "bg-theme-card border border-theme-border/70 text-theme-text shadow-sm rounded-[24px] rounded-bl-[8px]"
                         )}
                       >
                          {msg.role === 'model' ? (
                             <div className="prose dark:prose-invert prose-mahogany max-w-none text-[15px] leading-relaxed prose-p:my-2 prose-pre:bg-theme-muted/50 prose-pre:border prose-pre:border-theme-border/50 prose-pre:my-2 prose-pre:text-theme-text">
                               <ReactMarkdown 
                                  remarkPlugins={[remarkGfm, remarkMath]} 
                                  rehypePlugins={[rehypeKatex]}
                               >
                                 {msg.content}
                               </ReactMarkdown>
                             </div>
                          ) : (
                             <div className="whitespace-pre-wrap text-[15px]">{msg.content}</div>
                          )}
                       </div>
                    </div>
                 </div>
                )
              })
            )}
            {isAiLoading && (
              <div className="flex items-center gap-2 text-theme-accent-end font-bold animate-pulse">
                <Loader2 className="w-5 h-5 animate-spin" /> Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
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
                      <button type="button" onClick={() => toggleAttachment(id)} className="ml-1 hover:text-red-500 rounded-full p-0.5"><X className="w-3 h-3"/></button>
                    </span>
                  );
                })}
              </div>
           )}

          <form onSubmit={handleAiSubmit} className="p-3 py-4 border-t border-theme-border bg-theme-bg flex items-end gap-2 shrink-0 relative z-20">
            <button
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className={`p-3 rounded-2xl transition-all border shrink-0 ${showAttachMenu || attachedNoteIds.size > 0 ? 'bg-theme-accent-start text-white border-theme-accent-start shadow-sm' : 'bg-theme-muted/50 text-theme-text/60 border-theme-border/50 hover:bg-theme-border hover:text-theme-text'}`}
              title="Attach Study Material"
            >
              <Plus className="w-5 h-5" />
            </button>
            <div className="relative flex-1">
              <textarea
                rows={1}
                placeholder="Ask about your notes..."
                value={aiQuery}
                onChange={(e) => {
                  setAiQuery(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                }}
                disabled={isAiLoading && messages.length > 0 && !messages[messages.length-1].content} // disable only initially
                className="w-full bg-transparent border border-theme-border/80 rounded-[24px] px-5 text-[15px] outline-none focus:border-theme-accent-end py-[12px] pr-[50px] placeholder:text-theme-text/40 transition-colors resize-none overflow-hidden block"
                style={{ minHeight: '48px', maxHeight: '160px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAiSubmit(e as any);
                  }
                }}
              />
              <button 
                type="submit" 
                disabled={isAiLoading || !aiQuery.trim()}
                className="absolute right-1.5 bottom-[4px] bg-theme-accent-end text-white w-10 h-10 flex items-center justify-center rounded-full disabled:opacity-50 hover:shadow-md hover:scale-105 active:scale-95 transition-all shrink-0"
              >
                <Send className="w-4 h-4 -ml-0.5 mt-0.5" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

