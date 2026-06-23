import React, { useState, useEffect, useRef } from "react";
import { Maximize2, X, RotateCw } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Note } from "../types";
import { supabase } from "../supabaseClient";
import { DynamicCodeViewer } from "../components/DynamicCodeViewer";
import { Comments } from "../components/Comments";
import { useModalBack } from "../hooks/useHardwareBack";
import { cn } from "../lib/utils";

function getPdfEmbedUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.includes("drive.google.com")) {
    let embedUrl = url;
    if (embedUrl.includes("open?id=")) {
      const match = embedUrl.match(/open\?id=([^&]+)/);
      if (match && match[1]) {
        embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    } else if (embedUrl.includes("/view")) {
      embedUrl = embedUrl.replace(/\/view.*/, "/preview");
    } else if (embedUrl.includes("/edit")) {
      embedUrl = embedUrl.replace(/\/edit.*/, "/preview");
    } else if (!embedUrl.endsWith("/preview") && embedUrl.includes("/d/")) {
      const parts = embedUrl.split("/");
      const dIndex = parts.indexOf("d");
      if (dIndex !== -1 && parts[dIndex + 1]) {
        embedUrl = `https://drive.google.com/file/d/${parts[dIndex + 1]}/preview`;
      }
    }
    return embedUrl;
  }
  return url;
}

interface NoteViewProps {
  note: Note;
  onBack: () => void;
  isDarkMode?: boolean;
}

export function NoteView({ note, onBack, isDarkMode = false }: NoteViewProps) {
  const [fullNote, setFullNote] = useState<Note | null>(note);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFallbackRotated, setIsFallbackRotated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Safe checks for user's pdf_link or pdf_url
  const pdfUrl = fullNote?.pdf_link || (fullNote as any)?.pdf_url;

  // Trap back button to exit the NoteView content view
  useModalBack(true, onBack);
  // Trap back button to exit Fullscreen without exiting NoteView
  useModalBack(isFullscreen, () => setIsFullscreen(false));

  useEffect(() => {
    document.body.classList.add("note-view-open");
    return () => {
      document.body.classList.remove("note-view-open");
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.warn);
      }
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen && document.fullscreenElement) {
       document.exitFullscreen().catch(console.warn);
       setIsFallbackRotated(false);
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (note.html_code) {
      setFullNote(note);
      return;
    }
    const fetchNote = async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("id", note.id)
        .single();
      if (data && !error) setFullNote(data as Note);
    };
    fetchNote();
  }, [note]);

  const handleRotate = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      
      // Explicitly checking screen.orientation for TypeScript
      const screenObj = window.screen as any;
      if (screenObj && screenObj.orientation && screenObj.orientation.lock) {
        const currentType = screenObj.orientation.type;
        const newLock = currentType.startsWith("landscape") ? "portrait" : "landscape";
        await screenObj.orientation.lock(newLock);
      } else {
        throw new Error("Screen Orientation API not supported on this device/browser.");
      }
    } catch (e) {
      console.warn("Native screen rotation failed, using CSS fallback", e);
      setIsFallbackRotated(prev => !prev);
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-theme-bg overflow-hidden ${isFullscreen ? "fixed inset-0 z-50 w-full" : "relative w-full"}`}
    >
      {/* Fullscreen Header Bar */}
      {isFullscreen && (
        <div className="w-full bg-theme-bg/95 backdrop-blur border-b border-theme-border py-2 px-4 flex items-center justify-between z-[60] no-print shrink-0 h-12">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-heading font-semibold text-xs md:text-sm text-theme-text/80 truncate">
              {fullNote?.title}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRotate}
              className="bg-theme-card text-theme-text p-1.5 rounded-full border border-theme-border shadow-sm hover:bg-theme-muted transition-colors w-8 h-8 flex items-center justify-center"
              title="Rotate Screen"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsFullscreen(false);
              }}
              className="bg-red-500/10 text-red-500 p-1.5 rounded-full border border-red-500/20 shadow-sm hover:bg-red-500/20 transition-colors w-8 h-8 flex items-center justify-center"
              title="Exit Fullscreen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Content Area */}
      <div 
        className={cn("w-full flex-1 overflow-y-auto overflow-x-hidden relative print-content transition-transform duration-300 transform-gpu", isFallbackRotated ? "rotate-90 origin-center min-w-[100vh] min-h-[100vw]" : "")} 
        ref={scrollRef}
        style={isFallbackRotated ? { width: '100vh', height: '100vw', margin: 'auto', left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(90deg)' } : {}}
      >
        {!isFullscreen && (
          <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
            {fullNote?.pdf_link && !pdfUrl && (
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

        <div
          className={
            pdfUrl
              ? "w-full h-full relative flex flex-col"
              : fullNote?.html_code && !fullNote.html_code.startsWith("data:application/pdf")
              ? "w-full min-h-full p-0 m-0 relative flex flex-col"
              : note.type === "STATIC_A4"
              ? `max-w-[794px] w-full mx-auto p-0 m-0 relative min-h-full ${isDarkMode ? "bg-white" : ""}`
              : "w-full min-h-full p-0 m-0 relative"
          }
        >
          {pdfUrl ? (
            <div className="w-full h-full flex flex-col">
              <iframe
                src={getPdfEmbedUrl(pdfUrl)}
                className={cn(
                  "w-full bg-white block border-none",
                  isFullscreen ? "h-[calc(100vh-48px)]" : "h-[75vh]"
                )}
                allow="autoplay"
                title="Google Drive PDF Reader"
              ></iframe>
            </div>
          ) : fullNote?.html_code === null || fullNote?.html_code === undefined ? (
            <div className="flex items-center justify-center min-h-[50vh] opacity-50 font-sans">
              Loading material...
            </div>
          ) : fullNote.html_code.startsWith("data:application/pdf") ? (
            <object
              data={fullNote.html_code}
              type="application/pdf"
              className="w-full min-h-screen border-none block bg-white"
            >
              <div className="p-10 text-center w-full mt-20 font-bold opacity-50 font-sans">
                Browser unable to inline PDF.<br /><br /> <a href={fullNote.html_code} download={note.title + ".pdf"} className="underline text-theme-accent-end">Download PDF directly</a>
              </div>
            </object>
          ) : (
            <div className="w-full h-full flex-1 min-h-full p-0 m-0">
              <DynamicCodeViewer content={fullNote.html_code} />
            </div>
          )}
        </div>
      </div>

      {/* Community System Footer */}
      {!isFullscreen && (
        <div className="w-full shrink-0">
          <Comments noteId={note.id} />
        </div>
      )}
    </div>
  );
}

