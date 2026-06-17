import React from 'react';

export function TextFormatter({ text }: { text: string }) {
  if (!text) return null;

  // Regex to match Arabic text including diacritical marks
  const arabicRegex = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)/g;

  // Split string by regex. Since the regex has a capturing group, the split 
  // array will contain alternating non-matched and matched segments.
  const chunks = text.split(arabicRegex);

  // Helper to check if a chunk contains Arabic characters
  const isArabicChunk = (str: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(str);

  return (
    <>
      {chunks.map((chunk, index) => {
        if (!chunk) return null;

        if (isArabicChunk(chunk)) {
          return (
            <span
              key={index}
              dir="rtl"
              className="font-arabic text-[1em] leading-relaxed px-[2px] inline-block align-baseline"
            >
              {chunk}
            </span>
          );
        }

        return (
          <span key={index} className="font-sans text-[1em]">
            {chunk}
          </span>
        );
      })}
    </>
  );
}
