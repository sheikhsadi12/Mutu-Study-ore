import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Bot, Loader2, Plus, FileText, CheckCircle2, Menu, ArrowLeft, Copy, Check, MessageSquare, PlusCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Note } from '../types';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
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

interface ChatSession {
  id: string;
  title: string;
  messages: AiMessage[];
  updatedAt: number;
}

export function ChatComponent({ currentNote }: ChatComponentProps) {
  const navigate = useNavigate();
  const [aiQuery, setAiQuery] = useState('');
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const systemKey = import.meta.env.VITE_GEMINI_API_KEY;
  const [localApiKey, setLocalApiKey] = useState(() => localStorage.getItem('mutu_user_gemini_key') || '');
  const [showSetupGuide, setShowSetupGuide] = useState(!systemKey && !localApiKey);
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Attachments State
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [attachedNoteIds, setAttachedNoteIds] = useState<Set<string>>(new Set(currentNote ? [currentNote.id] : []));

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load sessions from local storage
    if (currentUser?.id) {
      const saved = localStorage.getItem(`mutu_ai_sessions_${currentUser.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSessions(parsed);
        } catch (e) {
          setSessions([]);
        }
      } else {
        setSessions([]);
      }
      setIsLoaded(true);
    } else {
      setSessions([]);
      setMessages([]);
      setCurrentSessionId(null);
      setIsLoaded(false);
    }
  }, [currentUser]);

  useEffect(() => {
    // Save sessions to local storage
    if (isLoaded && currentUser?.id && sessions.length > 0) {
      localStorage.setItem(`mutu_ai_sessions_${currentUser.id}`, JSON.stringify(sessions));
    }
  }, [sessions, currentUser, isLoaded]);

  useEffect(() => {
    // Sync messages to current session
    if (!currentSessionId && messages.length > 0) {
      const newId = Date.now().toString();
      setCurrentSessionId(newId);
      setSessions(prev => {
         const titleStr = messages[0].content.substring(0, 30);
         const newSess: ChatSession = { id: newId, title: titleStr + (messages[0].content.length > 30 ? '...' : ''), messages, updatedAt: Date.now() };
         return [newSess, ...prev];
      });
    } else if (currentSessionId && messages.length > 0) {
      setSessions(prev => {
         const newSess = [...prev];
         const idx = newSess.findIndex(s => s.id === currentSessionId);
         if (idx > -1) {
            newSess[idx].messages = messages;
            newSess[idx].updatedAt = Date.now();
            return newSess.sort((a,b) => b.updatedAt - a.updatedAt);
         } else {
             const titleStr = messages[0].content.substring(0, 30);
             newSess.push({ id: currentSessionId, title: titleStr + (messages[0].content.length > 30 ? '...' : ''), messages, updatedAt: Date.now() });
             return newSess.sort((a,b) => b.updatedAt - a.updatedAt);
         }
      });
    }
  }, [messages, currentSessionId]);

  useEffect(() => {
    if (currentNote) {
      setAttachedNoteIds(prev => new Set(prev).add(currentNote.id));
    }
  }, [currentNote]);

  useEffect(() => {
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

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setIsSidebarOpen(false);
  };

  const loadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setIsSidebarOpen(false);
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleAiSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      const extractPlainText = (html: string) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
      };
      let contextText = "";
      // Only inject context on first message
      if (attachedNoteIds.size > 0 && messages.length === 0) {
        const idsArray = Array.from(attachedNoteIds);
        const { data: attachedNotesData } = await supabase.from('notes').select('title, html_code').in('id', idsArray);
        
        if (attachedNotesData) {
           contextText = attachedNotesData.map(n => `--- Module: ${n.title} ---\n${extractPlainText(n.html_code || '')}`).join('\n\n');
        }
      }

      const systemInstruction = `You are an expert AI tutor. Use the provided context to answer the user's question perfectly in Bengali. DO NOT mention HTML.`;

      const historyToPass = messages.map(m => ({
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
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIdx = newMessages.length - 1;
                  newMessages[lastIdx] = { ...newMessages[lastIdx], content: newMessages[lastIdx].content + chunkText };
                  return newMessages;
                });
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
    <div className="flex w-full h-full bg-theme-bg overflow-hidden relative">
      {/* Sidebar Overlay (Mobile) & Drawer */}
      {isSidebarOpen && (
         <div className="absolute inset-0 bg-black/50 z-50 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
      
      <div className={cn("absolute md:relative z-50 h-full w-72 bg-theme-bg border-r border-theme-border shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out flex flex-col shrink-0", isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden")}>
         <div className="p-4 border-b border-theme-border flex items-center justify-between">
            <h2 className="font-heading font-black text-theme-text flex items-center gap-2">
              <Bot className="w-5 h-5" /> Chat History
            </h2>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-theme-text/60 hover:text-theme-text">
              <X className="w-5 h-5" />
            </button>
         </div>
         <div className="p-3">
            <button onClick={startNewChat} className="w-full flex items-center gap-2 px-3 py-2.5 bg-theme-accent-start/10 text-theme-accent-start hover:bg-theme-accent-start/20 rounded-xl font-bold transition-colors text-sm">
               <PlusCircle className="w-4 h-4" /> New Chat
            </button>
         </div>
         <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
            {sessions.map(session => (
              <button 
                key={session.id}
                onClick={() => loadSession(session)}
                className={cn("w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 transition-colors group", currentSessionId === session.id ? "bg-theme-muted/80 text-theme-text font-bold" : "text-theme-text/70 hover:bg-theme-muted/50")}
              >
                <MessageSquare className="w-4 h-4 shrink-0 opacity-60 group-hover:opacity-100" />
                <div className="truncate flex-1">{session.title}</div>
              </button>
            ))}
            {sessions.length === 0 && (
               <div className="text-center text-xs text-theme-text/40 pt-4 italic">No previous chats.</div>
            )}
         </div>
      </div>

      <div className="flex-1 flex flex-col h-full min-w-0 bg-theme-bg">
        {/* Header */}
        <header className="h-[56px] px-4 md:px-6 flex items-center border-b border-theme-border bg-theme-bg shrink-0 z-40 sticky top-0 w-full">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/80 mr-2 shrink-0 md:hidden">
            <Menu className="w-5 h-5" />
          </button>
          {!isSidebarOpen && (
             <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/80 mr-2 shrink-0 hidden md:block">
               <Menu className="w-5 h-5" />
             </button>
          )}
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/80 mr-3 shrink-0 hidden md:block">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-theme-accent-start to-theme-accent-end flex items-center justify-center text-white shrink-0 shadow-sm">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base md:text-lg font-heading font-black text-theme-accent-start leading-none truncate flex items-center gap-2">
              AI Assistant
            </h1>
          </div>
        </header>

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
                  <span className="font-bold text-theme-accent-start">Step 1:</span> Go to Google AI Studio.
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
                <p><span className="font-bold text-theme-accent-start">Step 2:</span> Log in with your account.</p>
                <p><span className="font-bold text-theme-accent-start">Step 3:</span> Click 'Create API key in new project' and copy the token.</p>
                <p><span className="font-bold text-theme-accent-start">Step 4:</span> Paste the Key below and 'Save'.</p>
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
            <div className="flex-1 p-4 md:p-6 overflow-y-auto w-full space-y-6 max-w-4xl mx-auto">
              {messages.length === 0 ? (
                <div className="opacity-60 text-center h-full flex flex-col items-center justify-center italic gap-3">
                  <Bot className="w-12 h-12 opacity-50" />
                  <p>Ask a question based on your materials.<br/>Attach specific notes to guide my context.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  if (msg.role === 'model' && !msg.content && isAiLoading) return null; // hide empty bot message until streaming starts
                  const isUser = msg.role === 'user';
                  return (
                   <div key={idx} className={cn("flex flex-col w-full relative group", isUser ? "items-end" : "items-start")}>
                      <div className={cn("flex items-end gap-1.5 w-full", isUser ? "justify-end" : "justify-start")}>
                         <div 
                           className={cn(
                             "w-fit max-w-[95%] md:max-w-[85%] break-words relative transform-gpu shadow-sm group-hover:shadow-md transition-shadow",
                             isUser 
                               ? "bg-theme-accent-start text-white rounded-[24px] rounded-br-[8px] py-2 px-3 text-[15px]" 
                               : "bg-white text-gray-800 border border-gray-200 dark:bg-[#2a020b] dark:text-[#e8c3a2] dark:border dark:border-[#7c2d12]/30 rounded-[24px] rounded-bl-[8px] py-2 px-3"
                           )}
                         >
                            {msg.role === 'model' ? (
                               <div className="relative group/copy">
                                 <div className="prose prose-sm dark:prose-invert max-w-none text-[15px] leading-relaxed">
                                   <ReactMarkdown 
                                      remarkPlugins={[remarkGfm, remarkMath]} 
                                      rehypePlugins={[rehypeKatex]}
                                   >
                                     {msg.content}
                                   </ReactMarkdown>
                                 </div>
                                 <button 
                                   onClick={() => handleCopy(msg.content, idx)}
                                   className="opacity-0 group-hover/copy:opacity-100 absolute top-0 right-0 p-1.5 rounded-md bg-theme-muted/20 border border-theme-border text-theme-text/70 shadow-sm hover:text-theme-accent-start hover:bg-theme-card transition-all z-10"
                                   title="Copy message"
                                 >
                                   {copiedIndex === idx ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                 </button>
                               </div>
                            ) : (
                               <div className="whitespace-pre-wrap">{msg.content}</div>
                            )}
                         </div>
                      </div>
                   </div>
                  )
                })
              )}
              {isAiLoading && (
                <div className="flex items-center gap-2 text-theme-accent-end font-bold animate-pulse text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" /> Thinking...
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>

            <div className="w-full max-w-4xl mx-auto relative px-4 pb-4">
              {/* Attachments Menu Overlay */}
              {showAttachMenu && (
                <div className="absolute bottom-full left-4 right-4 mb-2 bg-theme-card border border-theme-border max-h-48 overflow-y-auto shadow-xl rounded-xl z-10 animate-in slide-in-from-bottom-2">
                  <div className="p-2 border-b border-theme-border/50 bg-theme-muted/30 sticky top-0 flex justify-between items-center backdrop-blur-sm z-20">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-theme-text/60 ml-2">Available Materials</span>
                    <button onClick={() => setShowAttachMenu(false)} className="text-theme-text/40 hover:text-theme-text p-1">
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
                  <div className="px-3 py-2 border border-theme-border bg-theme-card mb-2 rounded-xl flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 shadow-sm">
                    <span className="text-[10px] font-bold text-theme-text/40 uppercase shrink-0">Context:</span>
                    {Array.from(attachedNoteIds).map(id => {
                      const n = allNotes.find(an => an.id === id);
                      if (!n) return null;
                      return (
                        <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-theme-muted border border-theme-border text-[10px] whitespace-nowrap text-theme-text/80 font-medium">
                          <FileText className="w-3 h-3" />
                          {n.title.substring(0, 15)}{n.title.length > 15 ? '...' : ''}
                          <button type="button" onClick={() => toggleAttachment(id)} className="ml-1 hover:text-red-500 rounded-full p-0.5"><X className="w-3 h-3"/></button>
                        </span>
                      );
                    })}
                  </div>
               )}

              <form onSubmit={handleAiSubmit} className="p-2 border border-theme-border bg-theme-bg/80 backdrop-blur-md rounded-3xl flex items-end gap-2 shrink-0 shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className={`p-3 rounded-2xl transition-all border shrink-0 ${showAttachMenu || attachedNoteIds.size > 0 ? 'bg-theme-accent-start text-white border-theme-accent-start shadow-sm' : 'bg-theme-muted/50 text-theme-text/60 border-theme-border/50 hover:bg-theme-border hover:text-theme-text'}`}
                  title="Attach Study Material"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <div className="relative flex-1 flex items-center">
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
                    className="w-full bg-transparent border-0 px-4 text-[15px] outline-none py-3 pr-12 placeholder:text-theme-text/40 resize-none overflow-hidden block text-theme-text"
                    style={{ minHeight: '48px', maxHeight: '160px' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAiSubmit();
                      }
                    }}
                  />
                  <button 
                    type="submit" 
                    disabled={isAiLoading || !aiQuery.trim()}
                    className="absolute right-2 bottom-1.5 bg-theme-accent-end text-white w-9 h-9 flex items-center justify-center rounded-full disabled:opacity-50 hover:shadow-md hover:scale-105 active:scale-95 transition-all shrink-0"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
