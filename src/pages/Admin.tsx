import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Lock, Code, List, MessageSquare, Edit, Trash2, BookOpen } from 'lucide-react';
import { Note, Comment } from '../types';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

interface AdminProps {
  onBack?: () => void;
}

export function Admin({ onBack }: AdminProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate('/');
  };

  const [isAuthenticated, setIsAuthenticated] = useState(true); // Always true via private route
  
  const [activeTab, setActiveTab] = useState<'upload' | 'manage' | 'moderate'>('upload');

  // Form State
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [type, setType] = useState<'STATIC_A4' | 'DYNAMIC_APPLET'>('STATIC_A4');
  const [description, setDescription] = useState('');
  const [rawHtmlText, setRawHtmlText] = useState('');

  // Data State
  const [localNotes, setLocalNotes] = useState<Note[]>([]);
  const [allComments, setAllComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    // Fetch Notes from Supabase
    const { data: notesData, error } = await supabase.from('notes').select('*').order('created_at', { ascending: false });
    if (notesData && !error) {
       setLocalNotes(notesData as Note[]);
    }

    // Fetch Comments securely (currently local fallback for comments if supabase doesn't have it defined, wait let me keep it as localStorage for comments unless told otherwise. Actually let's assume comments are still local, the user didn't mention moving comments).
    let aggregateComments: Comment[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('comments_')) {
            const commentsStr = localStorage.getItem(key);
            if (commentsStr) {
                try {
                    const parsed = JSON.parse(commentsStr);
                    if (Array.isArray(parsed)) {
                        aggregateComments = [...aggregateComments, ...parsed];
                    }
                } catch (e) {
                    console.error("Failed to parse comments for key", key);
                }
            }
        }
    }
    
    // Deduplicate comments just in case
    const uniqueComments = Array.from(new Map(aggregateComments.map(c => [c.id, c])).values());
    uniqueComments.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setAllComments(uniqueComments);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin' || password === 'admin123') { 
      setIsAuthenticated(true);
    } else {
      alert("Invalid password");
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !rawHtmlText || !subject) {
      alert("Title, Subject and Raw HTML are required.");
      return;
    }

    const payload = {
      subject: subject,
      title: title,
      type: type,
      description: description,
      html_code: rawHtmlText
    };

    try {
      if (editNoteId) {
        const { error } = await supabase.from('notes').update(payload).eq('id', editNoteId);
        if (error) throw error;
        alert("Material successfully updated!");
      } else {
        const payloadWithId = {
           id: crypto.randomUUID(),
           ...payload,
           created_at: new Date().toISOString()
        };
        const { error } = await supabase.from('notes').insert([payloadWithId]);
        if (error) throw error;
        alert("Material successfully published!");
      }
      
      await fetchData();
      
      // Reset Form
      setEditNoteId(null);
      setTitle('');
      setDescription('');
      setSubject('');
      setRawHtmlText('');
      setActiveTab('manage');
    } catch (error) {
      console.warn("Storage exception:", error);
      alert("Error saving material to Supabase");
    }
  };

  const handleEditNote = (note: Note) => {
    setEditNoteId(note.id);
    setTitle(note.title);
    setSubject(note.subject);
    setType(note.type);
    setDescription(note.description);
    setRawHtmlText(note.html_code);
    setActiveTab('upload');
  };

  const handleDeleteNote = async (noteId: string) => {
    if (confirm("Are you sure you want to delete this note?")) {
      const { error } = await supabase.from('notes').delete().eq('id', noteId);
      if (!error) {
        // Also clean up associated comments and likes locally
        localStorage.removeItem(`comments_${noteId}`);
        localStorage.removeItem(`likes_${noteId}`);
        alert("Note deleted.");
        fetchData(); // Refresh list
      } else {
        alert("Error deleting note.");
      }
    }
  };

  const handleDeleteComment = (commentId: string, noteId: string) => {
    if (confirm("Delete this comment?")) {
      const key = `comments_${noteId}`;
      const commentsStr = localStorage.getItem(key);
      if (commentsStr) {
        try {
          const parsed: Comment[] = JSON.parse(commentsStr);
          const updated = parsed.filter(c => c.id !== commentId);
          localStorage.setItem(key, JSON.stringify(updated));
          
          setAllComments(prev => prev.filter(c => c.id !== commentId));
          alert("Comment removed.");
        } catch (e) {
          console.error("Failed to update comments in local storage");
        }
      }
    }
  };

  // Render Login
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-theme-bg relative">
        <button onClick={handleBack} className="absolute top-6 left-6 p-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/80">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="card-base p-8 w-[90%] max-w-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-theme-muted rounded-full flex items-center justify-center text-theme-accent-end mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="font-heading font-black text-2xl">Admin Access</h2>
            <p className="text-xs text-theme-text/60">Enter password</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password..."
              className="px-4 py-2 bg-theme-bg border border-theme-border rounded-md focus:outline-none focus:border-theme-accent-end"
            />
            <button className="bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white rounded-[25px] px-6 py-2.5 font-medium transition-all hover:opacity-90 shadow-md flex justify-center w-full" type="submit">Verify & Login</button>
          </form>
        </div>
      </div>
    );
  }

  // Render Dashboard
  return (
    <div className="flex flex-col h-screen bg-theme-bg overflow-y-auto w-full">
      <header className="py-2.5 md:py-4 px-4 md:px-6 border-b border-theme-border flex flex-col md:flex-row md:items-center justify-between gap-3 bg-theme-bg shrink-0 sticky top-0 z-20 shadow-sm w-full">
        <div className="flex items-center gap-3">
            <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/80">
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <div>
            <h1 className="font-heading font-black text-lg md:text-xl text-theme-accent-end">Admin Panel</h1>
            <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-theme-text/50">Management System</p>
            </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-theme-muted/50 p-1 rounded-full border border-theme-border/50">
            <button 
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all ${activeTab === 'upload' ? 'bg-theme-bg shadow-sm text-theme-accent-end border border-theme-border/50' : 'text-theme-text/60 hover:text-theme-text'}`}
            >
              <Upload className="w-3.5 h-3.5" />
              {editNoteId ? 'Edit Note' : 'Upload'}
            </button>
            <button 
              onClick={() => setActiveTab('manage')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all ${activeTab === 'manage' ? 'bg-theme-bg shadow-sm text-theme-accent-end border border-theme-border/50' : 'text-theme-text/60 hover:text-theme-text'}`}
            >
              <List className="w-3.5 h-3.5" />
              Manage Models
            </button>
            <button 
              onClick={() => setActiveTab('moderate')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all ${activeTab === 'moderate' ? 'bg-theme-bg shadow-sm text-theme-accent-end border border-theme-border/50' : 'text-theme-text/60 hover:text-theme-text'}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Moderation
            </button>
        </div>
      </header>

      <div className="p-4 md:p-6 w-full max-w-2xl mx-auto flex flex-col gap-6 md:gap-8 pb-12">
        
        {/* TAB 1: UPLOAD / EDIT NOTE */}
        {activeTab === 'upload' && (
            <div className="card-base w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="card-top-accent" />
            <div className="p-4 md:p-6">
                <div className="flex items-center gap-2 mb-5 md:mb-6 border-b border-theme-border pb-3 md:pb-4">
                <Upload className="w-4 h-4 md:w-5 md:h-5 text-theme-accent-end" />
                <h2 className="font-heading font-bold text-base md:text-lg">{editNoteId ? 'Edit Study Material' : 'Publish Study Material'}</h2>
                {editNoteId && (
                    <button onClick={() => {
                        setEditNoteId(null);
                        setTitle('');
                        setDescription('');
                        setRawHtmlText('');
                    }} className="ml-auto text-[10px] uppercase font-bold text-theme-text/50 hover:text-theme-accent-end">
                        Cancel Edit
                    </button>
                )}
                </div>
                
                <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] md:text-xs font-bold text-theme-text/70 uppercase">Title *</label>
                    <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Carnot Cycle Final Notes" className="px-3 py-2 bg-theme-bg border border-theme-border rounded-md text-xs md:text-sm focus:border-theme-accent-end outline-none shadow-sm" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] md:text-xs font-bold text-theme-text/70 uppercase">Subject *</label>
                    <input required type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Physics, Mathematics, History..." className="px-3 py-2 bg-theme-bg border border-theme-border rounded-md text-xs md:text-sm focus:border-theme-accent-end outline-none shadow-sm" />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] md:text-xs font-bold text-theme-text/70 uppercase">Format Type *</label>
                    <select required value={type} onChange={(e) => setType(e.target.value as 'STATIC_A4' | 'DYNAMIC_APPLET')} className="px-3 py-2 bg-theme-bg border border-theme-border rounded-md text-xs md:text-sm focus:border-theme-accent-end outline-none shadow-sm">
                    <option value="STATIC_A4">Document (Static A4)</option>
                    <option value="DYNAMIC_APPLET">Interactive/Applet</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] md:text-xs font-bold text-theme-text/70 uppercase">Description</label>
                    <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief summary of the contents..." className="px-3 py-2 bg-theme-bg border border-theme-border rounded-md text-xs md:text-sm focus:border-theme-accent-end outline-none shadow-sm font-arabic" />
                </div>

                <div className="flex flex-col gap-1.5 mt-2">
                    <label className="text-[10px] md:text-xs font-bold text-theme-text/70 uppercase flex items-center gap-1"><Code className="w-3 h-3"/> Raw HTML Content *</label>
                    <textarea required rows={8} value={rawHtmlText} onChange={(e) => setRawHtmlText(e.target.value)} placeholder="<div><h1>Heading</h1><p>Notes here...</p></div>" className="px-3 py-3 font-mono bg-[#1e1e1e] border border-theme-border rounded-md text-xs text-white focus:border-theme-accent-end outline-none shadow-inner" />
                </div>

                <button type="submit" className="bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white rounded-[25px] px-6 py-2.5 font-medium transition-all hover:opacity-90 shadow-md mt-4 w-full">
                    {editNoteId ? 'Update Material' : 'Publish Securely'}
                </button>
                </form>
            </div>
            </div>
        )}

        {/* TAB 2: MANAGE NOTES */}
        {activeTab === 'manage' && (
            <div className="card-base w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="card-top-accent" />
               <div className="p-4 md:p-6">
                  <h2 className="font-heading font-bold text-base md:text-lg mb-4 border-b border-theme-border pb-3">Local Repository</h2>
                  
                  {localNotes.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
               <div className="w-16 h-16 mb-4 rounded-full bg-theme-muted flex items-center justify-center shadow-inner border border-theme-border/50 text-theme-accent-end/60">
                 <BookOpen className="w-8 h-8" />
               </div>
               <h3 className="font-heading font-black text-lg text-theme-accent-end mb-2">Empty Repository</h3>
               <p className="text-sm font-semibold opacity-70 max-w-sm mx-auto leading-relaxed text-theme-text/80">
                 No modules found. Please upload new study materials.
               </p>
             </div>
                  ) : (
                      <div className="space-y-3">
                          {localNotes.map(note => (
                              <div key={note.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-theme-muted/30 border border-theme-border rounded-lg gap-4 shadow-sm hover:border-theme-accent-end/50 transition-colors">
                                  <div className="flex-1 min-w-0">
                                      <h3 className="font-bold text-sm md:text-base text-theme-text truncate">{note.title}</h3>
                                      <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[9px] font-black tracking-widest uppercase bg-theme-border/30 px-2 py-0.5 rounded-full text-theme-accent-end">
                                              {note.subject}
                                          </span>
                                          <span className="text-[10px] text-theme-text/60 font-semibold">{note.type === 'STATIC_A4' ? 'Static Doc' : 'Applet'}</span>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                      <button 
                                          onClick={() => handleEditNote(note)}
                                          className="p-2 bg-theme-bg border border-theme-border rounded-md text-theme-text/70 hover:text-theme-accent-end hover:border-theme-accent-end transition-colors"
                                          title="Edit Note"
                                      >
                                          <Edit className="w-4 h-4" />
                                      </button>
                                      <button 
                                          onClick={() => handleDeleteNote(note.id)}
                                          className="p-2 bg-red-500/10 border border-red-500/20 rounded-md text-red-600 hover:bg-red-500 hover:text-white transition-colors"
                                          title="Delete Note"
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
               </div>
            </div>
        )}

        {/* TAB 3: MODERATE COMMENTS */}
        {activeTab === 'moderate' && (
            <div className="card-base w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="card-top-accent" />
               <div className="p-4 md:p-6">
                  <h2 className="font-heading font-bold text-base md:text-lg mb-4 border-b border-theme-border pb-3">Community Moderation</h2>
                  
                  {allComments.length === 0 ? (
                      <p className="text-center text-sm font-bold text-theme-text/50 uppercase tracking-widest py-8">No comments found.</p>
                  ) : (
                      <div className="space-y-3">
                          {allComments.map(comment => (
                              <div key={comment.id} className="flex gap-3 p-3 bg-theme-bg border border-theme-border rounded-lg shadow-sm group hover:border-red-500/30 transition-colors">
                                  <div className="w-8 h-8 rounded-full bg-theme-accent-start text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                      {comment.authorName === 'Sheikh Sadi' ? 'SS' : comment.authorName.charAt(0)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start mb-1">
                                          <p className="font-bold text-xs text-theme-text">{comment.authorName}</p>
                                          <span className="text-[9px] uppercase tracking-widest font-bold text-theme-text/40">
                                              {new Date(comment.timestamp).toLocaleDateString()}
                                          </span>
                                      </div>
                                      <p className="opacity-80 leading-snug font-arabic text-xs md:text-sm mb-2 break-words">
                                          {comment.content}
                                      </p>
                                      <p className="text-[9px] font-mono text-theme-text/40 truncate">
                                          Parent Note ID: {comment.noteId}
                                      </p>
                                  </div>
                                  <button 
                                      onClick={() => handleDeleteComment(comment.id, comment.noteId)}
                                      className="self-start p-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 bg-red-500/10 border border-red-500/20 rounded-md text-red-600 hover:bg-red-500 hover:text-white transition-all shrink-0"
                                      title="Delete Comment"
                                  >
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                          ))}
                      </div>
                  )}
               </div>
            </div>
        )}
      </div>
    </div>
  );
}

