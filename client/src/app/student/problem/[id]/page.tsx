'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import {
  AlertTriangle,
  Play,
  Send,
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

const STATUS_BADGES: Record<string, { label: string; color: string; icon: 'check' | 'cross' | 'warn' }> = {
  ACCEPTED: { label: 'Accepted', color: 'text-green-400 bg-green-900/30 border-green-700/40', icon: 'check' },
  WRONG_ANSWER: { label: 'Wrong Answer', color: 'text-red-400 bg-red-900/30 border-red-700/40', icon: 'cross' },
  COMPILATION_ERROR: { label: 'Compilation Error', color: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/40', icon: 'warn' },
  RUNTIME_ERROR: { label: 'Runtime Error', color: 'text-orange-400 bg-orange-900/30 border-orange-700/40', icon: 'warn' },
  PENDING: { label: 'Pending', color: 'text-gray-400 bg-gray-900/30 border-gray-700/40', icon: 'warn' },
};

// --- Main Component ---

export default function StudentProblemPage() {
  const params = useParams();
  const router = useRouter();
  const problemId = params.id as string;

  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [code, setCode] = useState('');
  const [originalBoilerplate, setOriginalBoilerplate] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(LANGUAGES[0]);

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
  const [showSuccessConfetti, setShowSuccessConfetti] = useState(false);

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

  // Auto-save state indicator
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | null>(null);

  // Anti-cheat
  const { violationCount, isWarningVisible, acknowledgeWarning } = useAntiCheat({ problemId });

  const resultRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeRef = useRef(code);
  codeRef.current = code;

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- Auto-save code to localStorage with debounce ---
  const saveCode = useCallback((value: string) => {
    try {
      const key = `code-${problemId}-${selectedLanguage.judge0Id}`;
      localStorage.setItem(key, value);
    } catch { /* quota exceeded — ignore silently */ }
  }, [problemId, selectedLanguage.judge0Id]);

  const clearSavedCode = useCallback(() => {
    try {
      const key = `code-${problemId}-${selectedLanguage.judge0Id}`;
      localStorage.removeItem(key);
    } catch { /* ignore */ }
  }, [problemId, selectedLanguage.judge0Id]);

  const loadSavedCode = useCallback((): string | null => {
    try {
      const key = `code-${problemId}-${selectedLanguage.judge0Id}`;
      return localStorage.getItem(key);
    } catch { return null; }
  }, [problemId, selectedLanguage.judge0Id]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!problem) return; // Don't save before problem loads
    
    // Clear any pending save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Skip saving if code matches original boilerplate
    if (code === originalBoilerplate) {
      clearSavedCode();
      return;
    }

    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(() => {
      saveCode(code);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 1500);
    }, 800); // 800ms debounce

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [code, problem, originalBoilerplate, saveCode, clearSavedCode]);

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
      setOriginalBoilerplate(data.boilerplateCode || '');

      // Restore saved code from localStorage if available
      const saved = loadSavedCode();
      if (saved && saved !== (data.boilerplateCode || '')) {
        setCode(saved);
      } else {
        setCode(data.boilerplateCode || '');
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load problem');
    } finally {
      setLoading(false);
    }
  }, [problemId]);

  useEffect(() => { fetchProblem(); }, [fetchProblem]);

  // Scroll to result when it appears
  useEffect(() => {
    if (submissionResult || runResult || submissionError) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [submissionResult, runResult, submissionError]);

  // Confetti effect on accepted
  useEffect(() => {
    if (submissionResult?.status === 'ACCEPTED') {
      setShowSuccessConfetti(true);
      const timer = setTimeout(() => setShowSuccessConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [submissionResult]);

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
    clearSavedCode();
  };

  // Handle language change: save current code, load saved code for new language
  const handleLanguageChange = useCallback((lang: LanguageOption) => {
    // Save current code before switching
    saveCode(code);
    setSelectedLanguage(lang);

    // Compute key directly from target language (not from state, which is stale here)
    try {
      const key = `code-${problemId}-${lang.judge0Id}`;
      const saved = localStorage.getItem(key);
      // Use saved code for this language, or fall back to boilerplate
      setCode(saved ?? originalBoilerplate);
    } catch {
      setCode(originalBoilerplate);
    }
  }, [code, problemId, originalBoilerplate, saveCode]);

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

  // --- Keyboard shortcuts ---
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
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-blue-500 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (fetchError || !problem) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="scale-in rounded-xl border border-red-800/50 bg-red-950/30 p-8 text-center max-w-md">
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
      {/* Success Confetti Overlay */}
      {showSuccessConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 h-2 w-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                background: ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899'][i % 5],
                animation: `confetti-fall ${1 + Math.random()}s ${Math.random() * 0.5}s ease-out forwards`,
                opacity: 0.8,
              }}
            />
          ))}
        </div>
      )}

      {/* Help Request Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="scale-in mx-4 w-full max-w-md rounded-xl border border-yellow-600/30 bg-gray-900 p-6 shadow-2xl">
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
                <p className="mb-3 text-xs text-gray-400">Describe what you&apos;re stuck on:</p>
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="scale-in mx-4 w-full max-w-md rounded-xl border border-yellow-600/30 bg-gray-900 p-6 shadow-2xl">
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
      <div className="flex h-screen min-w-0 flex-col overflow-hidden bg-[#0a0a0f]">
        {/* Top Bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#1a1a2e]/80 bg-[#0a0a0f]/80 backdrop-blur-xl px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => router.push('/student/problems')} className="shrink-0 rounded-lg p-1.5 text-gray-500 transition-all hover:bg-white/5 hover:text-gray-300">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Code2 className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="truncate text-sm font-medium text-gray-200">{problem.title}</span>
            </div>
            <span className="hidden shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-500 sm:inline-flex border border-white/10">
              {selectedLanguage.label}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Font size controls */}
            <div className="flex items-center gap-1 mr-2">
              <button onClick={() => setFontSize(s => Math.max(10, s - 1))} className="rounded-md p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all">
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center text-[11px] text-gray-500 font-mono">{fontSize}</span>
              <button onClick={() => setFontSize(s => Math.min(30, s + 1))} className="rounded-md p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all">
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Resizable Panels */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <PanelGroup
            id="student-problem-main-panels"
            orientation="horizontal"
            className="min-h-0 min-w-0"
            resizeTargetMinimumSize={{ fine: 14, coarse: 28 }}
          >
            {/* Left Panel: Description + Test Cases */}
            <Panel id="problem-details-panel" defaultSize="45%" minSize="30%" maxSize="60%" className="min-h-0 min-w-0">
              <div className="flex h-full min-h-0 min-w-0 flex-col bg-[#0a0a0f]">
                {/* Left Panel Tabs */}
                <div role="tablist" aria-label="Problem details" className="flex min-w-0 shrink-0 overflow-x-auto border-b border-[#1a1a2e]/80 bg-[#0a0a0f]">
                  <button onClick={() => setLeftTab('description')}
                    role="tab"
                    aria-selected={leftTab === 'description'}
                    className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-all sm:px-4 ${
                      leftTab === 'description'
                        ? 'border-blue-500 text-blue-400 bg-white/[0.03]'
                        : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'
                    }`}>
                    <FileText className="h-3.5 w-3.5" />
                    Description
                  </button>
                  <button onClick={() => setLeftTab('testcases')}
                    role="tab"
                    aria-selected={leftTab === 'testcases'}
                    className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-all sm:px-4 ${
                      leftTab === 'testcases'
                        ? 'border-blue-500 text-blue-400 bg-white/[0.03]'
                        : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'
                    }`}>
                    <Code2 className="h-3.5 w-3.5" />
                    Test Cases
                    <span className="ml-1 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500">{problem.testCases.length}</span>
                  </button>
                </div>

                {/* Scrollable content */}
                <div className="min-h-0 flex-1 overflow-y-auto dark-scrollbar">
                  <div className="p-4 sm:p-6 lg:p-8">
                    {/* Description Tab Content */}
                    {leftTab === 'description' && (
                      <div className={`transition-all duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="mb-6">
                          <h1 className="text-3xl font-bold text-white leading-tight">{problem.title}</h1>
                        </div>

                        <div className="prose prose-invert max-w-none">
                          <ReactMarkdown components={{
                            code: ({ className, children, ...props }) => (
                              <code className="rounded bg-white/5 px-2 py-0.5 text-sm text-blue-300 border border-white/10" {...props}>{children}</code>
                            ),
                            pre: ({ children }) => (
                              <pre className="overflow-x-auto rounded-lg bg-white/[0.03] border border-[#1a1a2e] p-4 text-sm leading-relaxed">{children}</pre>
                            ),
                            h1: ({ children }) => <h1 className="text-2xl font-bold text-white mt-5 mb-3 pb-2 border-b border-[#1a1a2e]">{children}</h1>,
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
                      </div>
                    )}

                    {/* Test Cases Tab Content */}
                    {leftTab === 'testcases' && (
                      <div className={`transition-all duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="flex items-center gap-2 mb-5">
                          <Code2 className="h-4 w-4 text-blue-400" />
                          <h2 className="text-sm font-semibold text-white">
                            Sample Test Cases
                          </h2>
                          <span className="text-xs text-gray-500">({problem.testCases.length})</span>
                        </div>
                        <div className="space-y-4">
                          {problem.testCases.map((tc, i) => (
                            <div key={tc.id} className="stagger-item rounded-xl border border-[#1a1a2e] bg-white/[0.02] overflow-hidden transition-all duration-300 hover:border-blue-500/20 hover:bg-white/[0.04]"
                              style={{ animationDelay: `${i * 80}ms` }}>
                              {/* Case header */}
                              <div className="flex items-center gap-2 border-b border-[#1a1a2e] bg-white/[0.02] px-4 py-2.5">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-[11px] font-bold text-gray-400">
                                  {i + 1}
                                </span>
                                <span className="text-xs font-medium text-gray-400">
                                  Test Case
                                </span>
                              </div>
                              {/* Input */}
                              <div className="px-4 py-3 border-b border-[#1a1a2e]">
                                <p className="text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wider">Input</p>
                                <div className="rounded-lg bg-[#0a0a0f] border border-[#1a1a2e] px-3 py-2.5">
                                  <pre className="whitespace-pre-wrap break-words font-mono text-sm text-green-300">{tc.input}</pre>
                                </div>
                              </div>
                              {/* Expected Output */}
                              <div className="px-4 py-3">
                                <p className="text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wider">Expected Output</p>
                                <div className="rounded-lg bg-[#0a0a0f] border border-[#1a1a2e] px-3 py-2.5">
                                  <pre className="whitespace-pre-wrap break-words font-mono text-sm text-blue-300">{tc.expectedOutput}</pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="w-[3px] shrink-0 cursor-col-resize bg-[#1a1a2e] transition-colors hover:bg-blue-500/50 active:bg-blue-500" />

            {/* Right Panel: Editor + Console */}
            <Panel id="coding-workspace-panel" defaultSize="55%" minSize="40%" className="min-h-0 min-w-0">
              <div className="flex h-full min-h-0 min-w-0 flex-col">
                <PanelGroup
                  id="editor-console-panels"
                  orientation="vertical"
                  className="min-h-0 min-w-0 flex-1"
                  resizeTargetMinimumSize={{ fine: 14, coarse: 28 }}
                >
                  {/* Editor section */}
                  <Panel id="code-editor-panel" defaultSize="65%" minSize="30%" className="min-h-0 min-w-0">
                    <div className="flex h-full min-h-0 min-w-0 flex-col">
                      {/* Editor toolbar */}
                      <div className="flex items-center justify-between border-b border-[#1a1a2e] bg-[#0a0a0f] px-4 py-1.5 shrink-0">
                        <div className="flex items-center gap-1">
                          {/* Language tabs (LeetCode-style) */}
                          {LANGUAGES.map(lang => (
                            <button
                              key={lang.id}
                              onClick={() => handleLanguageChange(lang)}
                              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                                lang.id === selectedLanguage.id
                                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
                              }`}
                            >
                              {lang.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Auto-save indicator */}
                          {saveStatus && (
                            <span className={`inline-flex items-center gap-1 text-[10px] transition-all duration-300 ${
                              saveStatus === 'saving' ? 'text-yellow-500' : 'text-green-500'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${saveStatus === 'saving' ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
                              {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
                            </span>
                          )}
                          <button onClick={handleReset} title="Reset to boilerplate"
                            className="rounded-md p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all">
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={handleCopy} title="Copy code"
                            className="rounded-md p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all">
                            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          <span className="mx-2 text-[10px] text-gray-600 font-mono hidden sm:inline-flex items-center gap-1">
                            <Keyboard className="h-3 w-3" />
                            Ctrl+Enter Submit · Ctrl+Shift+Enter Run
                          </span>
                        </div>
                      </div>

                      {/* Editor */}
                      <div className="min-h-0 flex-1 overflow-hidden">
                        <CodeEditor
                          value={code}
                          onChange={setCode}
                          language={selectedLanguage.monacoLanguage}
                          theme="vs-dark"
                          height="100%"
                          fontSize={fontSize}
                        />
                      </div>
                    </div>
                  </Panel>

                  <PanelResizeHandle className="h-[3px] shrink-0 cursor-row-resize bg-[#1a1a2e] transition-colors hover:bg-blue-500/50 active:bg-blue-500" />

                  {/* Console section */}
                  <Panel id="console-panel" defaultSize="35%" minSize="15%" maxSize="60%" className="min-h-0 min-w-0">
                    <div className="flex h-full min-h-0 min-w-0 flex-col">
                      {/* Console tabs */}
                      <div role="tablist" aria-label="Console" className="flex min-w-0 shrink-0 overflow-x-auto border-b border-[#1a1a2e] bg-[#0a0a0f]">
                        {(['output', 'input', 'history'] as ConsoleTab[]).map(tab => (
                          <button key={tab} onClick={() => setActiveConsoleTab(tab)}
                            role="tab"
                            aria-selected={activeConsoleTab === tab}
                            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-all sm:px-4 ${
                              activeConsoleTab === tab
                                ? 'border-blue-500 text-blue-400 bg-white/[0.03]'
                                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'
                            }`}>
                            {tab === 'output' && <Terminal className="h-3.5 w-3.5" />}
                            {tab === 'input' && <Keyboard className="h-3.5 w-3.5" />}
                            {tab === 'history' && <History className="h-3.5 w-3.5" />}
                            {tab === 'output' ? 'Output' : tab === 'input' ? 'Custom Input' : `History (${submissionHistory.length})`}
                          </button>
                        ))}
                      </div>

                      {/* Console content */}
                      <div className="min-h-0 flex-1 overflow-y-auto bg-[#0a0a0f] p-4 dark-scrollbar" ref={resultRef}>
                        {/* Output Tab */}
                        {activeConsoleTab === 'output' && (
                          <div className="space-y-2">
                            {isRunning || isSubmitting ? (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <div className="relative flex h-4 w-4 items-center justify-center">
                                  <div className="absolute h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                                </div>
                                <span>{isSubmitting ? 'Running against test cases...' : 'Executing code...'}</span>
                              </div>
                            ) : submissionResult ? (
                              <div className="space-y-3 fade-in">
                                <div className={`flex items-start gap-3 rounded-xl border p-4 transition-all duration-300 ${
                                  submissionResult.status === 'ACCEPTED' ? 'bg-green-950/30 border-green-700/30 glow-green' :
                                  submissionResult.status === 'WRONG_ANSWER' ? 'bg-red-950/30 border-red-700/30 glow-red' :
                                  submissionResult.status === 'COMPILATION_ERROR' ? 'bg-yellow-950/30 border-yellow-700/30' :
                                  'bg-orange-950/30 border-orange-700/30'
                                }`}>
                                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                    submissionResult.status === 'ACCEPTED' ? 'bg-green-500/20' :
                                    submissionResult.status === 'WRONG_ANSWER' ? 'bg-red-500/20' :
                                    'bg-yellow-500/20'
                                  }`}>
                                    {submissionResult.status === 'ACCEPTED' ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                                    ) : submissionResult.status === 'WRONG_ANSWER' ? (
                                      <XCircle className="h-5 w-5 text-red-400" />
                                    ) : (
                                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-white">
                                      {STATUS_BADGES[submissionResult.status]?.label || submissionResult.status}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {submissionResult.status === 'ACCEPTED' ? (
                                        <span className="text-green-400">All test cases passed!</span>
                                      ) : (
                                        `Passed ${submissionResult.passedCases}/${submissionResult.totalCases} test cases`
                                      )}
                                    </p>
                                  </div>
                                </div>
                                {/* Progress bar */}
                                {submissionResult.status !== 'ACCEPTED' && (
                                  <div className="flex gap-1">
                                    {Array.from({ length: submissionResult.totalCases }).map((_, i) => (
                                      <div
                                        key={i}
                                        className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                                          i < submissionResult.passedCases
                                            ? 'bg-green-500'
                                            : i === submissionResult.passedCases
                                            ? 'bg-red-500'
                                            : 'bg-gray-700'
                                        }`}
                                        style={{ animationDelay: `${i * 50}ms` }}
                                      />
                                    ))}
                                  </div>
                                )}
                                {submissionResult.hint && (
                                  <div className="flex items-start gap-3 rounded-xl border border-yellow-700/30 bg-yellow-950/20 p-4 fade-in">
                                    <Lightbulb className="h-5 w-5 text-yellow-400 mt-0.5" />
                                    <div>
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-400">Hint</p>
                                      <p className="text-sm text-yellow-200 mt-0.5">{submissionResult.hint}</p>
                                    </div>
                                  </div>
                                )}
                                {submissionResult.stdout && <OutputBlock label="Standard Output" text={submissionResult.stdout} color="text-green-300" />}
                                {submissionResult.stderr && <OutputBlock label="Error Output" text={submissionResult.stderr} color="text-red-300" />}
                              </div>
                            ) : runResult ? (
                              <div className="space-y-2 fade-in">
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span className={`inline-flex items-center gap-1.5 ${
                                    runResult.statusId === 3 ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    <div className={`flex h-5 w-5 items-center justify-center rounded-md ${
                                      runResult.statusId === 3 ? 'bg-green-500/20' : 'bg-red-500/20'
                                    }`}>
                                      {runResult.statusId === 3 ? (
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      ) : (
                                        <XCircle className="h-3.5 w-3.5" />
                                      )}
                                    </div>
                                    {runResult.statusId === 3 ? 'Success' : `Exit Code: ${runResult.statusId}`}
                                  </span>
                                  {runResult.time && (
                                    <span className="flex items-center gap-1">
                                      <span className="h-1 w-1 rounded-full bg-gray-600" />
                                      Time: {runResult.time}s
                                    </span>
                                  )}
                                  {runResult.memory && (
                                    <span className="flex items-center gap-1">
                                      <span className="h-1 w-1 rounded-full bg-gray-600" />
                                      Memory: {Math.round(runResult.memory / 1024)}MB
                                    </span>
                                  )}
                                </div>
                                {runResult.stdout && <OutputBlock label="Output" text={runResult.stdout} color="text-green-300" />}
                                {runResult.stderr && <OutputBlock label="Error" text={runResult.stderr} color="text-red-300" />}
                                {!runResult.stdout && !runResult.stderr && (
                                  <p className="text-xs text-gray-600 italic">(No output)</p>
                                )}
                              </div>
                            ) : submissionError ? (
                              <div className="slide-down rounded-xl border border-red-700/30 bg-red-950/20 p-4">
                                <div className="flex items-start gap-3">
                                  <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
                                  <p className="text-sm text-red-400">{submissionError}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Terminal className="h-8 w-8 text-gray-700 mb-3" />
                                <p className="text-sm text-gray-600">Run your code to see output here</p>
                                <p className="text-[10px] text-gray-700 mt-1.5">
                                  <kbd className="rounded border border-gray-700 px-1.5 py-0.5 text-[10px] font-mono">Ctrl+Shift+Enter</kbd> Run ·
                                  <kbd className="rounded border border-gray-700 px-1.5 py-0.5 text-[10px] font-mono ml-1">Ctrl+Enter</kbd> Submit
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Custom Input Tab */}
                        {activeConsoleTab === 'input' && (
                          <div className="space-y-2">
                            <p className="text-xs text-gray-500">Enter custom input for your program:</p>
                            <textarea
                              value={customInput}
                              onChange={e => setCustomInput(e.target.value)}
                              className="w-full h-24 rounded-lg border border-[#1a1a2e] bg-[#0a0a0f] px-3 py-2 text-xs text-green-300 font-mono resize-none focus:outline-none focus:border-blue-500/50 placeholder:text-gray-600"
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
                                {submissionHistory.map((s, idx) => {
                                  const badge = STATUS_BADGES[s.status] || STATUS_BADGES.PENDING;
                                  return (
                                    <div key={s.id} className={`stagger-item flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-white/[0.03] transition-all`}
                                      style={{ animationDelay: `${idx * 50}ms` }}>
                                      <div className="flex items-center gap-2.5">
                                        <span className={`inline-flex h-2 w-2 rounded-full ${
                                          s.status === 'ACCEPTED' ? 'bg-green-400' :
                                          s.status === 'WRONG_ANSWER' ? 'bg-red-400' : 'bg-yellow-400'
                                        }`} />
                                        <span className={`text-xs font-medium ${badge.color.split(' ')[0]}`}>{badge.label}</span>
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
                  </Panel>
                </PanelGroup>

                {/* Action Bar */}
                <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#1a1a2e] bg-[#0a0a0f] px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <button onClick={() => setShowHelpModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-yellow-400 hover:text-yellow-300 hover:bg-white/5 transition-all border border-yellow-700/30"
                      title="Request help from your teacher">
                      <HelpCircle className="h-3 w-3" />
                      Help
                    </button>
                    <span className="mx-2 text-[10px] text-gray-600">{code.length > 0 ? `${code.split('\n').length} lines` : ''}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={handleRun} disabled={isRunning || isSubmitting}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        isRunning || isSubmitting ? 'cursor-not-allowed bg-white/5 text-gray-500' :
                        'border border-[#1a1a2e] text-gray-300 hover:bg-white/5 hover:border-blue-500/30'
                      }`}>
                      {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 text-green-400" />}
                      Run
                    </button>
                    <button onClick={handleSubmit} disabled={isSubmitting || isRunning}
                      className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
                        isSubmitting || isRunning ? 'cursor-not-allowed bg-blue-900/50 text-blue-400' :
                        'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-500/20'
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
    <div className="fade-in">
      <p className="mb-1 text-[10px] font-medium text-gray-600 uppercase tracking-wider">{label}</p>
      <pre className={`rounded-lg border border-[#1a1a2e] bg-[#0a0a0f] px-3 py-2 text-xs font-mono ${color} overflow-x-auto`}>
        {text}
      </pre>
    </div>
  );
}
