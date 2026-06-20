'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';

// Dynamically import Monaco Editor with SSR disabled
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#1e1e1e]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          <p className="text-sm text-gray-400">Loading editor...</p>
        </div>
      </div>
    ),
  }
);

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: string;
  height?: string;
  fontSize?: number;
}

/**
 * Reusable CodeEditor wrapper around @monaco-editor/react.
 * Provides a loading skeleton while Monaco dependencies are fetched.
 */
export default function CodeEditor({
  value,
  onChange,
  language = 'javascript',
  theme = 'vs-dark',
  height = '100%',
  fontSize = 14,
}: CodeEditorProps) {
  const handleChange = (val: string | undefined) => {
    if (val !== undefined) {
      onChange(val);
    }
  };

  return (
    <MonacoEditor
      height={height}
      language={language}
      theme={theme}
      value={value}
      onChange={handleChange}
      options={{
        minimap: { enabled: false },
        fontSize,
        fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
        fontLigatures: true,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        padding: { top: 12 },
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
      }}
    />
  );
}
