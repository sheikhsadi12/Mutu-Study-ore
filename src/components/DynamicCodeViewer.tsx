import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DynamicCodeViewerProps {
  content: string;
}

export function DynamicCodeViewer({ content }: DynamicCodeViewerProps) {
  // A basic check to see if the content contains HTML tags
  const safeContent = content || '';
  const hasHtml = /<[a-z][\s\S]*>/i.test(safeContent);

  if (!hasHtml) {
     return (
       <div className="markdown-body text-theme-text w-full">
         <Markdown remarkPlugins={[remarkGfm]}>{safeContent}</Markdown>
       </div>
     );
  }

  return (
    <iframe
      srcDoc={safeContent}
      sandbox="allow-scripts allow-same-origin"
      className="w-full min-h-screen border-none bg-white block"
      title="Live Output Viewer"
    />
  );
}
