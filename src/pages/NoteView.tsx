import React, { useState, useEffect, useRef } from "react";
import { Maximize2, X } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Note } from "../types";
import { supabase } from "../supabaseClient";
import { DynamicCodeViewer } from "../components/DynamicCodeViewer";
import { Comments } from "../components/Comments";
import { useHardwareBack } from "../hooks/useHardwareBack";

interface NoteViewProps {
  note: Note;
  onBack: () => void;
  isDarkMode?: boolean;
}

export function NoteView({ note, onBack, isDarkMode = false }: NoteViewProps) {
  const [fullNote, setFullNote] = useState<Note | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Trap back button to exit the NoteView content view
  useHardwareBack(true, onBack);
  // Trap back button to exit Fullscreen without exiting NoteView
  useHardwareBack(isFullscreen, () => setIsFullscreen(false));

  useEffect(() => {
    document.body.classList.add("note-view-open");
    return () => document.body.classList.remove("note-view-open");
  }, []);

  useEffect(() => {
    const fetchNote = async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("id", note.id)
        .single();
      if (data && !error) setFullNote(data as Note);
    };
    fetchNote();
  }, [note.id]);

  return (
    <div
      className={`flex flex-col h-full bg-theme-bg overflow-hidden ${isFullscreen ? "fixed inset-0 z-50 w-full" : "relative w-full"}`}
    >
      {/* Scrollable Content Area */}
      <div 
        className="w-full flex-1 overflow-y-auto overflow-x-hidden relative" 
        ref={scrollRef}
      >
        {isFullscreen ? (
          <button
            onClick={() => setIsFullscreen(false)}
            className="fixed top-4 right-4 z-[60] bg-theme-card text-theme-text p-2 rounded-full shadow-md hover:bg-theme-muted transition-colors w-8 h-8 flex items-center justify-center border border-theme-border"
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

        <div
          className={
            fullNote?.html_code && !fullNote.html_code.startsWith("data:application/pdf")
              ? "w-full min-h-full p-0 m-0 relative flex flex-col"
              : note.type === "STATIC_A4"
              ? `max-w-[794px] w-full mx-auto p-0 m-0 relative min-h-full ${isDarkMode ? "bg-white" : ""}`
              : "w-full min-h-full p-0 m-0 relative"
          }
        >
          {!fullNote?.html_code ? (
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

