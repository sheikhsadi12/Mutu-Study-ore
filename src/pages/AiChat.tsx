import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Bot, Loader2, Plus, FileText, CheckCircle2, Menu, ArrowLeft, PlusCircle, MessageSquare, Copy, CopyCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Note } from '../types';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useNavigate } from 'react-router-dom';

interface AiMessage {
  role: 'user' | 'model';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: AiMessage[];
  updatedAt: number;
}

export function AiChat({ toggleTheme, isDarkMode }: any) {
  const navigate = useNavigate();
  
  // Chat Session State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Initialize and listen to Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const [isLoaded, setIsLoaded] = useState(false);

  // Load chat sessions when user changes
  useEffect(() => {
    if (currentUser?.id) {
      const storageKey = `ai-chats-${currentUser.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSessions(parsed);
          setCurrentSessionId(parsed.length > 0 ? parsed[0].id : null);
        } catch (e) {
          setSessions([]);
          setCurrentSessionId(null);
        }
      } else {
        setSessions([]);
        setCurrentSessionId(null);
      }
      setIsLoaded(true);
    } else {
      setSessions([]);
      setCurrentSessionId(null);
      setIsLoaded(false);
    }
  }, [currentUser]);

  // Save chat sessions when they change
  useEffect(() => {
    if (isLoaded && currentUser?.id) {
      const storageKey = `ai-chats-${currentUser.id}`;
      localStorage.setItem(storageKey, JSON.stringify(sessions));
    }
  }, [sessions, currentUser, isLoaded]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Gemini State
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const systemKey = import.meta.env.VITE_GEMINI_API_KEY;
  const [localApiKey, setLocalApiKey] = useState(() => localStorage.getItem('mutu_user_gemini_key') || '');
  const [showSetupGuide, setShowSetupGuide] = useState(!systemKey && !localApiKey);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Attachments State
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [attachedNoteIds, setAttachedNoteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchNotesList = async () => {
      const { data } = await supabase.from('notes').select('id, title, subject');
      if (data) setAllNotes(data as Note[]);
    };
    if (allNotes.length === 0) fetchNotesList();
  }, [allNotes.length]);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

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
      if (newSet.has(noteId)) newSet.delete(noteId);
      else newSet.add(noteId);
      return newSet;
    });
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setIsSidebarOpen(false);
  };

  const handleAiSubmit = async () => {
    if (!aiQuery.trim() || isAiLoading) return;

    const apiKey = systemKey || localApiKey;
    if (!apiKey) {
      setShowSetupGuide(true);
      return;
    }

    const currentQuery = aiQuery.trim();
    setAiQuery('');
    
    if (textareaRef.current) {
       textareaRef.current.style.height = 'auto';
    }

    let activeId = currentSessionId;
    if (!activeId) {
      activeId = Date.now().toString();
      const title = currentQuery.slice(0, 30) + (currentQuery.length > 30 ? '...' : '');
      const newSession: ChatSession = { id: activeId, title, messages: [{ role: 'user', content: currentQuery }, { role: 'model', content: '' }], updatedAt: Date.now() };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(activeId);
    } else {
      setSessions(prev => prev.map(s => s.id === activeId ? {
        ...s,
        messages: [...s.messages, { role: 'user', content: currentQuery }, { role: 'model', content: '' }],
        updatedAt: Date.now()
      } : s));
    }

    setIsAiLoading(true);
    setShowAttachMenu(false);

    try {
      const extractPlainText = (html: string) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
      };
      
      let contextText = "";

      const currentMsgs = sessions.find(s => s.id === activeId)?.messages || [];
      if (attachedNoteIds.size > 0 && currentMsgs.length <= 2) {
        const idsArray = Array.from(attachedNoteIds);
        const { data: attachedNotesData } = await supabase.from('notes').select('title, html_code').in('id', idsArray);
        if (attachedNotesData) {
           contextText = attachedNotesData.map(n => `--- Module: ${n.title} ---\n${extractPlainText(n.html_code || '')}`).join('\n\n');
        }
      }

      const systemInstruction = `You are an expert AI tutor. Use the provided context to answer the user's question perfectly in Bengali. DO NOT mention HTML.`;

      const historyToPass = currentMsgs.filter(m => m.content !== '').map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      
      const actualPromptToSend = contextText 
        ? `Context Document:\n${contextText}\n\nUser Question:\n${currentQuery}`
        : currentQuery;

      historyToPass.push({ role: 'user', parts: [{ text: actualPromptToSend }]});

      const response = await fetch('/api/gemini', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           apiKey: apiKey,
           systemInstruction,
           contents: historyToPass
         })
      });

      if (!response.ok) {
         console.error(await response.text());
         throw new Error(`AI Error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");
      const decoder = new TextDecoder();
      let isFirstChunk = true;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() || "";
        
        for (const chunk of chunks) {
          if (chunk.startsWith('data: ')) {
            const dataStr = chunk.slice(6);
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                if (isFirstChunk) { setIsAiLoading(false); isFirstChunk = false; }
                const chunkText = data.text;
                
                setSessions(prev => prev.map(s => {
                  if (s.id === activeId) {
                     const newMsgs = [...s.messages];
                     const lastMsg = newMsgs[newMsgs.length - 1];
                     newMsgs[newMsgs.length - 1] = { ...lastMsg, content: lastMsg.content + chunkText };
                     return { ...s, messages: newMsgs, updatedAt: Date.now() };
                  }
                  return s;
                }));
              }
            } catch (err) {
               console.error("Parse error on stream chunk:", err);
            }
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      if (e?.message?.includes('API key not valid') || e?.message?.includes('quota') || e?.status === 403 || e?.status === 429) {
          setShowSetupGuide(true);
      } else {
          setSessions(prev => prev.map(s => {
            if (s.id === activeId) {
               const newMsgs = [...s.messages];
               const lastMsg = newMsgs[newMsgs.length - 1];
               newMsgs[newMsgs.length - 1] = { ...lastMsg, content: 'AI Error: ' + (e?.message || 'Failed to fetch response.') };
               return { ...s, messages: newMsgs, updatedAt: Date.now() };
            }
            return s;
          }));
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-theme-bg overflow-hidden relative font-sans">
      <header className="h-[56px] px-4 flex items-center justify-between border-b border-theme-border bg-theme-bg shrink-0 z-40 sticky top-0 w-full relative">
        <div className="flex items-center">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/80 mr-2">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 ml-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-theme-accent-start to-theme-accent-end flex items-center justify-center text-white shrink-0 shadow-sm">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base md:text-lg font-heading font-black text-theme-accent-start leading-none truncate max-w-[200px] md:max-w-[400px]">
              {currentSession ? currentSession.title : 'New Chat'}
            </h1>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/80">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </header>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
          <div className="relative w-[80%] max-w-[320px] bg-theme-bg h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-theme-border flex justify-between items-center bg-theme-muted/30">
              <h2 className="font-bold text-theme-text text-sm uppercase tracking-widest">Chat History</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 -mr-2 rounded-full hover:bg-theme-muted text-theme-text/60">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 border-b border-theme-border/50">
              <button 
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-theme-accent-start text-white rounded-[16px] font-bold shadow-md hover:bg-theme-accent-start/90 transition-all active:scale-[0.98]"
              >
                <PlusCircle className="w-5 h-5" /> New Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setCurrentSessionId(s.id); setIsSidebarOpen(false); }}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-[16px] flex items-center gap-3 transition-colors text-sm",
                    currentSessionId === s.id 
                      ? "bg-theme-muted font-semibold text-theme-text" 
                      : "text-theme-text/70 hover:bg-theme-muted/50"
                  )}
                >
                  <MessageSquare className="w-4 h-4 shrink-0 opacity-50" />
                  <span className="truncate flex-1">{s.title}</span>
                </button>
              ))}
              {sessions.length === 0 && (
                <div className="p-6 text-center text-xs text-theme-text/40 italic">
                  No previous chats
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 w-full max-w-4xl mx-auto overflow-hidden flex flex-col relative bg-theme-bg">
        {showSetupGuide ? (
          <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-theme-card border border-theme-border/60 rounded-[24px] p-8 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-theme-accent-start to-theme-accent-end"></div>
               <div className="flex items-center gap-3 text-theme-accent-end mb-6">
                 <Sparkles className="w-8 h-8" />
                 <h3 className="font-heading font-black text-[22px] tracking-tight text-theme-text">Connect Your AI</h3>
               </div>
               <div className="space-y-4 mb-8 text-[15px] leading-relaxed text-theme-text/80">
                 <p><span className="font-bold text-theme-accent-start">Step 1:</span> Get your API Key from Google AI Studio.</p>
                 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 bg-theme-muted border border-theme-border text-theme-text font-bold py-2.5 px-4 rounded-xl transition-all">
                   <Sparkles className="w-4 h-4 text-theme-accent-end" /> Google AI Studio
                 </a>
                 <p><span className="font-bold text-theme-accent-start">Step 2:</span> Paste it below.</p>
               </div>
               <div className="space-y-4">
                 <input type="password" placeholder="Paste your API Key here..." value={localApiKey} onChange={(e) => setLocalApiKey(e.target.value)} className="w-full bg-theme-bg border border-theme-border/80 rounded-xl px-4 py-3.5 outline-none focus:border-theme-accent-end transition-all shadow-inner text-[15px]" />
                 <button onClick={() => saveApiKey(localApiKey)} className="w-full bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-[15px]"><CheckCircle2 className="w-5 h-5" /> Save API Key</button>
               </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 p-4 md:p-6 overflow-y-auto w-full space-y-6">
              {messages.length === 0 ? (
                <div className="opacity-60 text-center h-full flex flex-col items-center justify-center gap-4">
                  <Bot className="w-16 h-16 opacity-30 text-theme-text" />
                  <p className="text-theme-text/80 text-lg font-medium">How can I help you today?</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  if (msg.role === 'model' && !msg.content && isAiLoading) return null;
                  return (
                   <div key={idx} className={cn("flex flex-col w-full relative", msg.role === 'user' ? "items-end" : "items-start")}>
                      <div className={cn("flex items-end gap-1.5 w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                         <div 
                           className={cn(
                             "w-fit max-w-[95%] md:max-w-[85%] py-2 px-3 break-words relative transform-gpu group transition-all",
                             msg.role === 'user' 
                               ? "bg-theme-accent-start text-white shadow-sm rounded-[24px] rounded-br-[8px]" 
                               : "bg-white text-gray-800 border border-gray-200 shadow-sm dark:bg-[#2a020b] dark:text-[#e8c3a2] dark:border dark:border-[#7c2d12]/30 rounded-[24px] rounded-bl-[8px]"
                           )}
                         >
                            {msg.role === 'model' ? (
                               <div className="relative">
                                  <div className="prose prose-sm dark:prose-invert max-w-none text-[15px] leading-relaxed">
                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown>
                                  </div>
                                  <button onClick={() => handleCopy(msg.content, idx)} className="absolute -top-1 -right-1 md:-right-2 md:-top-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-theme-bg/90 backdrop-blur border border-theme-border text-theme-text/60 hover:text-theme-text transition-all hover:scale-105 shadow-sm" title="Copy Message">
                                    {copiedIndex === idx ? <CopyCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                  </button>
                               </div>
                            ) : (
                               <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{msg.content}</div>
                            )}
                         </div>
                      </div>
                   </div>
                  )
                })
              )}
              {isAiLoading && (
                <div className="flex items-center gap-2 text-theme-accent-end font-bold animate-pulse px-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Thinking...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {showAttachMenu && (
              <div className="absolute bottom-[72px] left-2 right-2 md:left-6 md:right-6 bg-theme-card border border-theme-border rounded-[20px] max-h-60 overflow-y-auto shadow-2xl z-20 animate-in slide-in-from-bottom-2">
                <div className="p-3 border-b border-theme-border/50 bg-theme-muted/30 sticky top-0 flex justify-between items-center backdrop-blur-md">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-theme-text/60 ml-2">Available Materials</span>
                  <button onClick={() => setShowAttachMenu(false)} className="text-theme-text/40 hover:text-theme-text"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-2 space-y-1">
                  {allNotes.map(n => (
                    <button key={n.id} onClick={() => toggleAttachment(n.id)} className={cn("w-full text-left px-3 py-2.5 text-sm rounded-xl flex items-center justify-between transition-colors", attachedNoteIds.has(n.id) ? "bg-theme-accent-start/10 text-theme-accent-start font-bold" : "hover:bg-theme-muted text-theme-text/80")}>
                      <div className="flex items-center gap-2 truncate pr-2"><FileText className="w-4 h-4 shrink-0" /><span className="truncate">{n.title}</span></div>
                      {attachedNoteIds.has(n.id) && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    </button>
                  ))}
                  {allNotes.length === 0 && <div className="p-4 text-center text-sm text-theme-text/50">No materials available.</div>}
                </div>
              </div>
            )}

            <div className="p-3 md:p-4 bg-theme-bg shrink-0 relative z-30">
               {attachedNoteIds.size > 0 && !showAttachMenu && (
                  <div className="mb-2 px-1 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                    <span className="text-[10px] font-bold text-theme-text/40 uppercase shrink-0">Context:</span>
                    {Array.from(attachedNoteIds).map(id => {
                      const n = allNotes.find(an => an.id === id);
                      if (!n) return null;
                      return (
                        <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] bg-theme-muted border border-theme-border text-[11px] whitespace-nowrap text-theme-text/80 font-medium">
                          <FileText className="w-3 h-3" /> {n.title.substring(0, 20)}
                          <button type="button" onClick={() => toggleAttachment(id)} className="ml-1 hover:text-red-500 rounded-full p-0.5"><X className="w-3 h-3"/></button>
                        </span>
                      );
                    })}
                  </div>
               )}
               <form 
                  onSubmit={(e) => { e.preventDefault(); handleAiSubmit(); }} 
                  className="flex items-end gap-2 bg-theme-muted/50 dark:bg-theme-muted/30 border border-theme-border shadow-sm rounded-[24px] p-1.5 transition-all focus-within:border-theme-accent-end focus-within:ring-1 focus-within:ring-theme-accent-end"
               >
                 <button
                   type="button"
                   onClick={() => setShowAttachMenu(!showAttachMenu)}
                   className={cn("p-3 rounded-full transition-all shrink-0 ml-1.5 mb-0.5", showAttachMenu || attachedNoteIds.size > 0 ? 'bg-theme-accent-start text-white shadow-sm' : 'hover:bg-theme-border text-theme-text/60 hover:text-theme-text')}
                   title="Attach Context"
                 >
                   <Plus className="w-5 h-5" />
                 </button>
                 <div className="relative flex-1">
                   <textarea
                     ref={textareaRef}
                     rows={1}
                     placeholder="Message Gemini..."
                     value={aiQuery}
                     onChange={(e) => {
                       setAiQuery(e.target.value);
                       e.target.style.height = 'auto';
                       e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                     }}
                     disabled={isAiLoading && messages.length > 0 && !messages[messages.length-1].content}
                     className="w-full bg-transparent text-[15px] outline-none placeholder:text-theme-text/50 transition-colors resize-none overflow-hidden block py-[14px] px-2"
                     style={{ minHeight: '48px', maxHeight: '160px' }}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && !e.shiftKey) {
                         e.preventDefault();
                         handleAiSubmit();
                       }
                     }}
                   />
                 </div>
                 <button 
                   type="submit" 
                   disabled={isAiLoading || !aiQuery.trim()}
                   className="bg-theme-accent-end text-white p-3 md:p-3 w-11 h-11 md:w-12 md:h-12 flex items-center justify-center mb-0.5 mr-0.5 rounded-full disabled:opacity-40 hover:scale-105 active:scale-95 transition-all shrink-0 shadow-md"
                 >
                   <Send className="w-5 h-5 ml-[-2px] mt-[1px]" />
                 </button>
               </form>
               <div className="text-center mt-2 text-[11px] text-theme-text/40">Gemini may display inaccurate info, so double-check its responses.</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
