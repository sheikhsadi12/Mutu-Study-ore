import React, { useState } from 'react';
import { ArrowLeft, Upload, FileText, Lock } from 'lucide-react';
import { Note } from '../types';

interface AdminPanelProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  onBack: () => void;
}

export function AdminPanel({ notes, setNotes, onBack }: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  // Upload state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Physics'); // Subject
  const [chapter, setChapter] = useState('');
  const [description, setDescription] = useState('');
  const [fileDataUrl, setFileDataUrl] = useState('');
  const [fileName, setFileName] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') { // Simple mock password
      setIsAuthenticated(true);
    } else {
      alert("Invalid password");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    
    // Read file as Data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      setFileDataUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !fileDataUrl) {
      alert("Title and File are required.");
      return;
    }

    const newNote: Note = {
      id: crypto.randomUUID(),
      title,
      description,
      type: 'STATIC_A4', // Currently assuming PDFs
      category,
      chapter,
      sourceUrl: fileDataUrl, // Data URL of the PDF
      dateAdded: new Date().toISOString()
    };

    try {
      const newNotes = [newNote, ...notes];
      localStorage.setItem('mutu_notes', JSON.stringify(newNotes));
      setNotes(newNotes);
      alert("Material successfully uploaded!");
    } catch (error) {
      console.warn("Storage exception:", error);
      alert("Storage quota exceeded! File is too large for local caching. Saving without file data.");
      const fallbackNote = { ...newNote, sourceUrl: '<h1>Local File Too Large For Preview. Please host externally.</h1>' };
      const newNotes = [fallbackNote, ...notes];
      localStorage.setItem('mutu_notes', JSON.stringify(newNotes));
      setNotes(newNotes);
    }
    
    // Reset
    setTitle('');
    setDescription('');
    setChapter('');
    setFileName('');
    setFileDataUrl('');
  };

  // Render Login
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-theme-bg relative">
        <button onClick={onBack} className="absolute top-6 left-6 p-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/80">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="card-base p-8 w-[90%] max-w-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-theme-muted rounded-full flex items-center justify-center text-theme-accent-end mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="font-heading font-black text-2xl">Admin Access</h2>
            <p className="text-xs text-theme-text/60">Enter password 'admin123'</p>
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
      <header className="py-2.5 md:py-4 px-4 md:px-6 border-b border-theme-border flex items-center gap-3 bg-theme-bg shrink-0 sticky top-0 z-10 shadow-sm w-full">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/80">
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
        </button>
        <div>
          <h1 className="font-heading font-black text-lg md:text-xl text-theme-accent-end">Admin Panel</h1>
          <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-theme-text/50">Upload & Manage Materials</p>
        </div>
      </header>

      <div className="p-4 md:p-6 w-full max-w-2xl mx-auto flex flex-col gap-6 md:gap-8 pb-12">
        <div className="card-base w-full">
          <div className="card-top-accent" />
          <div className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-5 md:mb-6 border-b border-theme-border pb-3 md:pb-4">
              <Upload className="w-4 h-4 md:w-5 md:h-5 text-theme-accent-end" />
              <h2 className="font-heading font-bold text-base md:text-lg">Publish Study Material</h2>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] md:text-xs font-bold text-theme-text/70 uppercase">Title *</label>
                  <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Carnot Cycle Final Notes" className="px-3 py-2 bg-theme-bg border border-theme-border rounded-md text-xs md:text-sm focus:border-theme-accent-end outline-none shadow-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] md:text-xs font-bold text-theme-text/70 uppercase">Subject *</label>
                  <select required value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 bg-theme-bg border border-theme-border rounded-md text-xs md:text-sm focus:border-theme-accent-end outline-none shadow-sm">
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Biology">Biology</option>
                    <option value="Computer Science">Computer Science</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] md:text-xs font-bold text-theme-text/70 uppercase">Chapter (Optional)</label>
                <input type="text" value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="e.g. Chapter 3: Thermodynamics" className="px-3 py-2 bg-theme-bg border border-theme-border rounded-md text-xs md:text-sm focus:border-theme-accent-end outline-none shadow-sm" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] md:text-xs font-bold text-theme-text/70 uppercase">Description</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief summary of the contents..." className="px-3 py-2 bg-theme-bg border border-theme-border rounded-md text-xs md:text-sm focus:border-theme-accent-end outline-none shadow-sm font-arabic" />
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                 <label className="text-[10px] md:text-xs font-bold text-theme-text/70 uppercase">Material File (PDF) *</label>
                 <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-theme-border bg-theme-muted/20 rounded-md hover:bg-theme-muted/50 transition-colors cursor-pointer">
                    <input required type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
                    <FileText className="w-8 h-8 text-theme-text/30 mb-2" />
                    <span className="text-xs md:text-sm font-semibold text-theme-accent-end text-center p-2 truncate w-full max-w-[200px] md:max-w-[300px]">
                       {fileName || "Click to select local PDF file"}
                    </span>
                 </label>
              </div>

              <button type="submit" className="bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white rounded-[25px] px-6 py-2.5 font-medium transition-all hover:opacity-90 shadow-md mt-4 w-full">
                Publish Securely
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
