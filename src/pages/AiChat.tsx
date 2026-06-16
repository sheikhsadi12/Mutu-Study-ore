import React, { useState } from 'react';
import { ChatComponent } from '../components/ChatComponent';
import { Bot, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AiChat({ toggleTheme, isDarkMode }: any) {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col h-screen bg-theme-bg overflow-hidden relative">
      <header className="h-[56px] px-4 md:px-6 flex items-center border-b border-theme-border bg-theme-bg shrink-0 z-40 sticky top-0 w-full">
        <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-theme-muted transition-colors text-theme-text/80 mr-3 shrink-0">
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
      <div className="flex-1 w-full max-w-4xl mx-auto md:p-6 overflow-hidden flex flex-col relative">
        <div className="flex-1 bg-theme-bg border max-md:border-x-0 border-theme-border md:rounded-[20px] shadow-sm flex flex-col overflow-hidden relative">
             <ChatComponent />
        </div>
      </div>
    </div>
  );
}
