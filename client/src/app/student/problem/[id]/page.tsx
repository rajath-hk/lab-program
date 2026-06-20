'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import {
  AlertTriangle,
  Play,
  Send,
  ChevronDown,
  Code2,
  Loader2,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Terminal,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  History,
  Copy,
  Check,
  FileText,
  Keyboard,
  ArrowLeft,
  HelpCircle,
  MessageCircle,
} from 'lucide-react';
import CodeEditor from '@/components/editor/CodeEditor';
import { useAntiCheat } from '@/hooks/useAntiCheat';

// --- Types ---

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

interface ProblemDetails {
  id: string;
  title: string;
  description: string;
  boilerplateCode: string;
  testCases: TestCase[];
  totalTestCases: number;
  createdAt: string;
  updatedAt: string;
}

interface SubmissionResult {
  status: 'ACCEPTED' | 'WRONG_ANSWER' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' | 'ERROR';
  passedCases: number;
  totalCases: number;
  stdout: string | null;
  stderr: string | null;
  hint: string | null;
}

interface RunResult {
  stdout: string | null;
  stderr: string | null;
  statusId: number;
  time: string | null;
  memory: number | null;
}

interface SubmissionHistoryItem {
  id: string;
  status: string;
  languageId: number;
  executionTime: number | null;
  errorMessage: string | null;
  createdAt: string;
}

// --- Language Options ---

interface LanguageOption {
  id: string;
  label: string;
  monacoLanguage: string;
  judge0Id: number;
}

const LANGUAGES: LanguageOption[] = [
  { id: 'java', label: 'Java', monacoLanguage: 'java', judge0Id: 62 },
  { id: 'python', label: 'Python', monacoLanguage: 'python', judge0Id: 71 },
  { id: 'cpp', label: 'C++', monacoLanguage: 'cpp', judge0Id: 54 },
  { id: 'javascript', label: 'JavaScript', monacoLanguage: 'javascript', judge0Id: 63 },
];

const LANGUAGE_MAP: Record<number, string> = {
  62: 'Java', 71: 'Python', 54: 'C++', 63: 'JavaScript',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// --- Status helpers ---

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  ACCEPTED: { label: 'Accepted', color: 'text-green-400 bg-green-900/30 border-green-700/40' },
  WRONG_ANSWER: { label: 'Wrong Answer', color: 'text-red-400 bg-red-900/30 border-red-700/40' },
  COMPILATION_ERROR: { label: 'Compilation Error', color: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/40' },
  RUNTIME_ERROR: { label: 'Runtime Error', color: 'text-orange-400 bg-orange-900/30 border-orange-700/40' },
  PENDING: { label: 'Pending', color: 'text-gray-400 bg-gray-900/30 border-gray-700/40' },
};

// --- Main Component ---

export default function StudentProblemPage() {
  const params = useParams();
  const router = useRouter();
  const problemId = params.id as string;

  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [originalBoilerplate, setOriginalBoilerplate] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(LANGUAGES[0]);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);

  // Editor settings
  const [fontSize, setFontSize] = useState(14);

  // Left panel tab
  type LeftTab = 'description' | 'testcases';
  const [leftTab, setLeftTab] = useState<LeftTab>('description');

  // Console state
  type ConsoleTab = 'output' | 'input' | 'history';
  const [activeConsoleTab, setActiveConsoleTab] = useState<ConsoleTab>('output');

  // Run state
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [customInput, setCustomInput] = useState('');

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Submission history
  const [submissionHistory, setSubmissionHistory] = useState<SubmissionHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Help request
  const [helpMessage, setHelpMessage] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpSending, setHelpSending] = useState(false);
  const [helpSent, setHelpSent] = useState(false);

  // Copy feedback
  const [copied, setCopied] = useState(false);

  // Anti-cheat
  const { violationCount, isWarningVisible, acknowledgeWarning } = useAntiCheat({ problemId });

  const editorRef = useRef<any>(null);

  // --- Fetch Problem ---
  const fetchProblem = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const token = localStorage.getItem('token');
      if (!token) { setFetchError('Authentication required.'); return; }

      const response = await fetch(`${API_URL}/api/student/problems/${problemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch problem');

      setProblem(data);
      setCode(data.boilerplateCode || '');
      setOriginalBoilerplate(data.boilerplateCode || '');
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load problem');
    } finally {
      setLoading(false);
    }
  }, [problemId]);

  useEffect(() => { fetchProblem(); }, [fetchProblem]);

  // --- Run Code ---
  const handleRun = useCallback(async () => {
    try {
      setIsRunning(true);
      setRunResult(null);
      setActiveConsoleTab('output');

      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/student/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sourceCode: code,
          languageId: selectedLanguage.judge0Id,
          stdin: customInput,
        }),
      });
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Run failed');
      setRunResult(data);
    } catch (err) {
      setRunResult({
        stdout: null,
        stderr: err instanceof Error ? err.message : 'Run failed',
        statusId: 0,
        time: null,
        memory: null,
      });
    } finally {
      setIsRunning(false);
    }
  }, [code, selectedLanguage.judge0Id, customInput]);

  // --- Submit Code ---
  const handleSubmit = useCallback(async () => {
    try {
      setIsSubmitting(true);
      setSubmissionResult(null);
      setSubmissionError(null);
      setActiveConsoleTab('output');

      const token = localStorage.getItem('token');
      if (!token) { setSubmissionError('Authentication required.'); return; }

      const response = await fetch(`${API_URL}/api/student/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sourceCode: code,
          languageId: selectedLanguage.judge0Id,
          problemId,
        }),
      });
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Submission failed');
      setSubmissionResult(data);
      // Refresh history
      fetchSubmissions();
    } catch (err) {
      setSubmissionError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  }, [code, selectedLanguage.judge0Id, problemId]);

  // --- Fetch Submission History ---
  const fetchSubmissions = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${API_URL}/api/student/submissions?problemId=${problemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      setSubmissionHistory(data.submissions || []);
    } catch { /* ignore */ }
    finally { setHistoryLoading(false); }
  }, [problemId]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // --- Reset Code ---
  const handleReset = () => {
    setCode(originalBoilerplate);
  };

  // --- Help Request ---
  const handleHelpRequest = async () => {
    if (!helpMessage.trim()) return;
    try {
      setHelpSending(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/student/help-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ problemId, message: helpMessage }),
      });
      if (!response.ok) throw new Error('Failed to send help request');
      setHelpSent(true);
      setTimeout(() => { setShowHelpModal(false); setHelpSent(false); setHelpMessage(''); }, 2000);
    } catch { /* ignore */ }
    finally { setHelpSending(false); }
  };

  // --- Copy Code ---
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  // --- Keyboard shortcuts (using refs to avoid re-registering on every keystroke) ---
  const handleSubmitRef = useRef(handleSubmit);
  const handleRunRef = useRef(handleRun);
  handleSubmitRef.current = handleSubmit;
  handleRunRef.current = handleRun;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmitRef.current();
      } else if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        handleRunRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Format date ---
  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d1117]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-blue-500 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (fetchError || !problem) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d1117]">
        <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-8 text-center max-w-md">
          <XCircle className="mx-auto mb-3 h-8 w-8 text-red-400" />
          <p className="text-sm text-red-400">{fetchError || 'Problem not found'}</p>
          <button onClick={fetchProblem} className="mt-4 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Help Request Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-yellow-600/30 bg-gray-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/20">
                <MessageCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Request Help</h3>
                <p className="text-xs text-gray-400">Your teacher will see this request</p>
              </div>
            </div>
            {helpSent ? (
              <div className="flex flex-col items-center py-4">
                <CheckCircle2 className="h-10 w-10 text-green-400 mb-2" />
                <p className="text-sm text-green-300 font-medium">Help request sent!</p>
                <p className="text-xs text-gray-500 mt-1">Your teacher will respond shortly.</p>
              </div>
            ) : (
              <>
                <p className="mb-3 text-xs text-gray-400">Describe what you're stuck on:</p>
                <textarea
                  value={helpMessage}
                  onChange={e => setHelpMessage(e.target.value)}
                  className="w-full h-24 rounded-lg border border-[#30363d] bg-[#161b22] px-3 py-2 text-xs text-gray-200 font-mono resize-none focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
                  placeholder="e.g. I'm getting a compilation error on line 12..."
                />
                <div className="flex items-center justify-end gap-2 mt-4">
                  <button onClick={() => { setShowHelpModal(false); setHelpMessage(''); }}
                    className="rounded-lg border border-[#30363d] px-3 py-1.5 text-xs text-gray-400 hover:bg-[#21262d] transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleHelpRequest} disabled={!helpMessage.trim() || helpSending}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
                      !helpMessage.trim() || helpSending ? 'cursor-not-allowed bg-yellow-900/50 text-yellow-500' : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    }`}>
                      {helpSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      {helpSending ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Anti-cheat Modal */}
      {isWarningVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-yellow-600/30 bg-gray-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/20">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Tab Switching Detected</h3>
                <p className="text-xs text-gray-400">Violation #{violationCount}</p>
              </div>
            </div>
            <p className="mb-6 text-sm text-gray-300">
              Warning: Tab switching has been detected. This infraction has been logged and may be reviewed by your instructor.
            </p>
            <button onClick={acknowledgeWarning} className="w-full rounded-lg bg-yellow-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-yellow-700">
              Acknowledge &amp; Continue
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex h-screen flex-col bg-[#0d1117]">
        {/* Top Bar */}
        <header className="flex items-center justify-between border-b border-[#21262d] bg-[#161b22] px-4 py-2">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/student/problems')} className="text-gray-500 hover:text-gray-300 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-gray-200">{problem.title}</span>
            </div>
            <span className="rounded-full bg-[#21262d] px-2 py-0.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
              {selectedLanguage.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Font size controls */}
            <div className="flex items-center gap-1 mr-2">
              <button onClick={() => setFontSize(s => Math.max(10, s - 1))} className="rounded p-1 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] transition-colors">
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center text-[11px] text-gray-500 font-mono">{fontSize}</span>
              <button onClick={() => setFontSize(s => Math.min(30, s + 1))} className="rounded p-1 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] transition-colors">
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Language selector */}
            <div className="relative">
              <button onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                className="flex items-center gap-1.5 rounded-md border border-[#30363d] bg-[#21262d] px-2.5 py-1.5 text-xs text-gray-300 hover:bg-[#30363d] transition-colors">
                <FileText className="h-3 w-3" />
                <span>{selectedLanguage.label}</span>
                <ChevronDown className="h-3 w-3 text-gray-500" />
              </button>
              {languageDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setLanguageDropdownOpen(false)} />
                  <div className="absolute right-0 z-20 mt-1 w-36 rounded-md border border-[#30363d] bg-[#21262d] shadow-xl">
                    {LANGUAGES.map(lang => (
                      <button key={lang.id} onClick={() => { setSelectedLanguage(lang); setLanguageDropdownOpen(false); }}
                        className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-[#30363d] ${lang.id === selectedLanguage.id ? 'text-blue-400' : 'text-gray-400'}`}>
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Resizable Panels */}
        <div className="flex-1 overflow-hidden">
          <PanelGroup orientation="horizontal">
            {/* Left Panel: Description + Test Cases with Tabs */}
            <Panel defaultSize={45} minSize={30} maxSize={60}>
              <div className="h-full flex flex-col bg-[#0d1117]">
                {/* Left Panel Tabs */}
                <div className="flex border-b border-[#21262d] bg-[#161b22] shrink-0">
                  <button onClick={() => setLeftTab('description')}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                      leftTab === 'description'
                        ? 'border-blue-500 text-blue-400 bg-[#0d1117]'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}>
                    <FileText className="h-3.5 w-3.5" />
                    Problem
                  </button>
                  <button onClick={() => setLeftTab('testcases')}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                      leftTab === 'testcases'
                        ? 'border-blue-500 text-blue-400 bg-[#0d1117]'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}>
                    <Code2 className="h-3.5 w-3.5" />
                    Test Cases
                    <span className="ml-1 rounded-full bg-[#21262d] px-1.5 py-0.5 text-[10px] text-gray-400">{problem.testCases.length}</span>
                  </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-8">
                    {/* Description Tab Content */}
                    {leftTab === 'description' && (
                      <>
                        <div className="mb-6">
                          <h1 className="text-3xl font-bold text-white leading-tight">{problem.title}</h1>
                        </div>

                        <div className="prose prose-invert max-w-none">
                          <ReactMarkdown components={{
                            code: ({ className, children, ...props }) => (
                              <code className="rounded bg-[#1c2128] px-2 py-0.5 text-sm text-blue-300 border border-[#30363d]" {...props}>{children}</code>
                            ),
                            pre: ({ children }) => (
                              <pre className="overflow-x-auto rounded-lg bg-[#161b22] border border-[#21262d] p-4 text-sm leading-relaxed">{children}</pre>
                            ),
                            h1: ({ children }) => <h1 className="text-2xl font-bold text-white mt-5 mb-3 pb-2 border-b border-[#21262d]">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xl font-semibold text-white mt-4 mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-lg font-semibold text-white mt-4 mb-2">{children}</h3>,
                            p: ({ children }) => <p className="text-lg leading-relaxed text-gray-100 mb-4">{children}</p>,
                            ul: ({ children }) => <ul className="text-lg text-gray-100 space-y-2 mb-4 list-disc pl-6">{children}</ul>,
                            li: ({ children }) => <li className="text-lg text-gray-100">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                          }}>
                            {problem.description}
                          </ReactMarkdown>
                        </div>
                      </>
                    )}

                    {/* Test Cases Tab Content */}
                    {leftTab === 'testcases' && (
                      <>
                        <div className="flex items-center gap-2 mb-5">
                          <Code2 className="h-4 w-4 text-blue-400" />
                          <h2 className="text-sm font-semibold text-white">
                            Sample Test Cases
                          </h2>
                          <span className="text-xs text-gray-500">({problem.testCases.length})</span>
                        </div>
                        <div className="space-y-4">
                          {problem.testCases.map((tc, i) => (
                            <div key={tc.id} className="rounded-xl border border-[#30363d] bg-[#161b22] overflow-hidden shadow-sm hover:border-[#484f58] transition-colors">
                              {/* Case header */}
                              <div className="flex items-center gap-2 border-b border-[#21262d] bg-[#1c2128] px-4 py-2.5">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#30363d] text-[11px] font-bold text-gray-400">
                                  {i + 1}
                                </span>
                                <span className="text-xs font-medium text-gray-400">
                                  Test Case
                                </span>

                              </div>
                              {/* Input */}
                              <div className="px-4 py-3 border-b border-[#21262d]">
                                <p className="text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                                  Input
                                </p>
                                <div className="rounded-lg bg-[#0d1117] border border-[#21262d] px-3 py-2.5">
                                  <pre className="text-sm text-green-300 font-mono whitespace-pre-wrap">{tc.input}</pre>
                                </div>
                              </div>
                              {/* Expected Output */}
                              <div className="px-4 py-3">
                                <p className="text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                                  Expected Output
                                </p>
                                <div className="rounded-lg bg-[#0d1117] border border-[#21262d] px-3 py-2.5">
                                  <pre className="text-sm text-blue-300 font-mono whitespace-pre-wrap">{tc.expectedOutput}</pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="w-1.5 cursor-col-resize bg-[#21262d] transition-colors hover:bg-blue-500 active:bg-blue-600" />

            {/* Right Panel: Editor + Console */}
            <Panel defaultSize={55} minSize={40}>
              <div className="flex h-full flex-col">
                {/* Editor toolbar */}
                <div className="flex items-center justify-between border-b border-[#21262d] bg-[#161b22] px-4 py-1.5">
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Code</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={handleReset} title="Reset to boilerplate"
                      className="rounded-md p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] transition-colors">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={handleCopy} title="Copy code"
                      className="rounded-md p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#21262d] transition-colors">
                      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <span className="mx-2 text-[10px] text-gray-600 font-mono hidden sm:inline-flex items-center gap-1">
                      <Keyboard className="h-3 w-3" />
                      Ctrl+Enter Submit · Ctrl+Shift+Enter Run
                    </span>
                  </div>
                </div>

                {/* Editor */}
                <div className="flex-1 overflow-hidden">
                  <CodeEditor
                    value={code}
                    onChange={setCode}
                    language={selectedLanguage.monacoLanguage}
                    theme="vs-dark"
                    height="100%"
                    fontSize={fontSize}
                  />
                </div>

                {/* Console Panel */}
                <div className="border-t border-[#21262d] flex flex-col" style={{ minHeight: 300, maxHeight: 350 }}>
                  {/* Console tabs */}
                  <div className="flex border-b border-[#21262d] bg-[#161b22]">
                    {(['output', 'input', 'history'] as ConsoleTab[]).map(tab => (
                      <button key={tab} onClick={() => setActiveConsoleTab(tab)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                          activeConsoleTab === tab
                            ? 'border-blue-500 text-blue-400 bg-[#0d1117]'
                            : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}>
                        {tab === 'output' && <Terminal className="h-3.5 w-3.5" />}
                        {tab === 'input' && <Keyboard className="h-3.5 w-3.5" />}
                        {tab === 'history' && <History className="h-3.5 w-3.5" />}
                        {tab === 'output' ? 'Output' : tab === 'input' ? 'Custom Input' : `History (${submissionHistory.length})`}
                      </button>
                    ))}
                  </div>

                  {/* Console content */}
                  <div className="flex-1 overflow-y-auto bg-[#0d1117] p-4 min-h-[120px]">
                    {/* Output Tab */}
                    {activeConsoleTab === 'output' && (
                      <div className="space-y-2">
                        {isRunning || isSubmitting ? (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                            <span>{isSubmitting ? 'Running against test cases...' : 'Executing code...'}</span>
                          </div>
                        ) : submissionResult ? (
                          <div className="space-y-3">
                            <div className={`flex items-start gap-2.5 rounded-lg border p-3 ${
                              submissionResult.status === 'ACCEPTED' ? 'bg-green-950/30 border-green-800/40' :
                              submissionResult.status === 'WRONG_ANSWER' ? 'bg-red-950/30 border-red-800/40' :
                              submissionResult.status === 'COMPILATION_ERROR' ? 'bg-yellow-950/30 border-yellow-800/40' :
                              'bg-orange-950/30 border-orange-800/40'
                            }`}>
                              {submissionResult.status === 'ACCEPTED' ? <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5" /> :
                               <XCircle className="h-4 w-4 text-red-400 mt-0.5" />}
                              <div>
                                <p className="text-sm font-semibold text-white">
                                  {STATUS_BADGES[submissionResult.status]?.label || submissionResult.status}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {submissionResult.status === 'ACCEPTED' ? 'All test cases passed!' :
                                   `Passed ${submissionResult.passedCases}/${submissionResult.totalCases} test cases`}
                                </p>
                              </div>
                            </div>
                            {submissionResult.hint && (
                              <div className="flex items-start gap-2.5 rounded-lg border border-yellow-800/30 bg-yellow-950/20 p-3">
                                <Lightbulb className="h-4 w-4 text-yellow-400 mt-0.5" />
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-400">Teacher's Hint</p>
                                  <p className="text-xs text-yellow-200 mt-0.5">{submissionResult.hint}</p>
                                </div>
                              </div>
                            )}
                            {submissionResult.stdout && <OutputBlock label="Standard Output" text={submissionResult.stdout} color="text-green-300" />}
                            {submissionResult.stderr && <OutputBlock label="Error Output" text={submissionResult.stderr} color="text-red-300" />}
                          </div>
                        ) : runResult ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-3 text-[11px] text-gray-500">
                              <span className={`inline-flex items-center gap-1 ${runResult.statusId === 3 ? 'text-green-400' : 'text-red-400'}`}>
                                {runResult.statusId === 3 ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                {runResult.statusId === 3 ? 'Success' : `Exit Code: ${runResult.statusId}`}
                              </span>
                              {runResult.time && <span>Time: {runResult.time}s</span>}
                              {runResult.memory && <span>Memory: {Math.round(runResult.memory / 1024)}MB</span>}
                            </div>
                            {runResult.stdout && <OutputBlock label="Output" text={runResult.stdout} color="text-green-300" />}
                            {runResult.stderr && <OutputBlock label="Error" text={runResult.stderr} color="text-red-300" />}
                            {!runResult.stdout && !runResult.stderr && (
                              <p className="text-xs text-gray-600 italic">(No output)</p>
                            )}
                          </div>
                        ) : submissionError ? (
                          <div className="rounded-lg border border-red-800/40 bg-red-950/20 p-3">
                            <p className="text-xs text-red-400">{submissionError}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-6 text-center">
                            <Terminal className="h-6 w-6 text-gray-700 mb-2" />
                            <p className="text-xs text-gray-600">Run your code to see output here</p>
                            <p className="text-[10px] text-gray-700 mt-1">Ctrl+Shift+Enter to Run · Ctrl+Enter to Submit</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Custom Input Tab */}
                    {activeConsoleTab === 'input' && (
                      <div className="space-y-2">
                        <p className="text-[11px] text-gray-500">Enter custom input for your program:</p>
                        <textarea
                          value={customInput}
                          onChange={e => setCustomInput(e.target.value)}
                          className="w-full h-24 rounded-lg border border-[#21262d] bg-[#161b22] px-3 py-2 text-xs text-green-300 font-mono resize-none focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
                          placeholder="e.g.&#10;3 4&#10;10 20"
                          spellCheck={false}
                        />
                        <button onClick={handleRun} disabled={isRunning}
                          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                            isRunning ? 'bg-blue-900/50 text-blue-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}>
                          {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                          {isRunning ? 'Running...' : 'Run with Input'}
                        </button>
                      </div>
                    )}

                    {/* History Tab */}
                    {activeConsoleTab === 'history' && (
                      <div>
                        {historyLoading ? (
                          <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Loading history...
                          </div>
                        ) : submissionHistory.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-6 text-center">
                            <History className="h-5 w-5 text-gray-700 mb-2" />
                            <p className="text-xs text-gray-600">No submissions yet</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {submissionHistory.map((s) => {
                              const badge = STATUS_BADGES[s.status] || STATUS_BADGES.PENDING;
                              return (
                                <div key={s.id} className="flex items-center justify-between rounded px-3 py-2 hover:bg-[#161b22] transition-colors">
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                      s.status === 'ACCEPTED' ? 'bg-green-400' :
                                      s.status === 'WRONG_ANSWER' ? 'bg-red-400' : 'bg-yellow-400'
                                    }`} />
                                    <span className={`text-[11px] font-medium ${badge.color.split(' ')[0]}`}>{badge.label}</span>
                                    <span className="text-[10px] text-gray-600">{LANGUAGE_MAP[s.languageId] || 'Unknown'}</span>
                                    {s.executionTime && <span className="text-[10px] text-gray-600">{s.executionTime}s</span>}
                                  </div>
                                  <span className="text-[10px] text-gray-600">{formatDate(s.createdAt)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between border-t border-[#21262d] bg-[#161b22] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowHelpModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-yellow-400 hover:text-yellow-300 hover:bg-[#21262d] transition-colors border border-yellow-700/30"
                      title="Request help from your teacher">
                      <HelpCircle className="h-3 w-3" />
                      Help
                    </button>
                    <span className="mx-2 text-[10px] text-gray-600">{code.length > 0 ? `${code.split('\n').length} lines` : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleRun} disabled={isRunning || isSubmitting}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        isRunning || isSubmitting ? 'cursor-not-allowed bg-[#21262d] text-gray-500' :
                        'border border-[#30363d] text-gray-300 hover:bg-[#21262d]'
                      }`}>
                      {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 text-green-400" />}
                      Run
                    </button>
                    <button onClick={handleSubmit} disabled={isSubmitting || isRunning}
                      className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
                        isSubmitting || isRunning ? 'cursor-not-allowed bg-blue-900/50 text-blue-400' :
                        'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                      }`}>
                      {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      {isSubmitting ? 'Evaluating...' : 'Submit'}
                    </button>
                  </div>
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </div>
      </div>
    </>
  );
}

// --- Helper Components ---

function OutputBlock({ label, text, color }: { label: string; text: string; color: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-medium text-gray-600 uppercase tracking-wider">{label}</p>
      <pre className={`rounded-lg border border-[#21262d] bg-[#161b22] px-3 py-2 text-xs font-mono ${color} overflow-x-auto`}>
        {text}
      </pre>
    </div>
  );
}
