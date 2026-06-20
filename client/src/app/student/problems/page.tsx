'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Code2, LogOut, Loader2, Search, CheckCircle2, XCircle } from 'lucide-react';
import StudentRoute from '@/components/auth/StudentRoute';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ProblemListItem {
  id: string;
  title: string;
  testCaseCount: number;
  createdAt: string;
}

// Difficulty heuristic based on test case count and title keywords
function getDifficulty(title: string, testCaseCount: number): { label: string; color: string; bg: string } {
  const lower = title.toLowerCase();
  if (lower.includes('hard') || lower.includes('advanced') || testCaseCount > 6) {
    return { label: 'Hard', color: 'text-red-400', bg: 'bg-red-500/10' };
  }
  if (lower.includes('medium') || lower.includes('intermediate') || testCaseCount > 3) {
    return { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
  }
  return { label: 'Easy', color: 'text-green-400', bg: 'bg-green-500/10' };
}

function ProblemsList() {
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchProblems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const response = await fetch(`${API_URL}/api/student/problems`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch problems');
      }

      setProblems(data.problems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load problems');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredProblems = useMemo(() => {
    if (!searchQuery.trim()) return problems;
    const q = searchQuery.toLowerCase();
    return problems.filter(p => p.title.toLowerCase().includes(q));
  }, [problems, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <Code2 className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white">MCA Lab</h1>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-400 transition-all hover:border-white/20 hover:text-white hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Page header */}
        <div className={`mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-3xl font-bold text-white">Problems</h2>
          <p className="mt-1.5 text-sm text-gray-500">
            {problems.length} problem{problems.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Search bar */}
        <div className={`mb-6 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search problems..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 transition-all focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <p className="text-sm text-gray-500">Loading problems...</p>
            </div>
          </div>
        ) : error ? (
          <div className="fade-in rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
            <XCircle className="mx-auto mb-3 h-8 w-8 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={fetchProblems}
              className="mt-4 text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
            >
              Try again
            </button>
          </div>
        ) : filteredProblems.length === 0 ? (
          <div className="fade-in rounded-xl border border-white/10 bg-white/5 p-16 text-center">
            <Code2 className="mx-auto mb-4 h-12 w-12 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-300">
              {searchQuery ? 'No matching problems' : 'No problems available'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery ? 'Try a different search term.' : 'Check back later when your instructor adds problems.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProblems.map((problem, index) => {
              const diff = getDifficulty(problem.title, problem.testCaseCount);
              return (
                <Link
                  key={problem.id}
                  href={`/student/problem/${problem.id}`}
                  className={`group stagger-item block rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-300 hover:border-blue-500/20 hover:bg-white/[0.05] hover:shadow-lg hover:shadow-blue-500/5`}
                  style={{ animationDelay: `${100 + index * 60}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-gray-200 group-hover:text-blue-400 transition-colors duration-200 truncate">
                          {problem.title}
                        </h3>
                        <span className={`shrink-0 rounded-full ${diff.bg} px-2.5 py-0.5 text-[11px] font-medium ${diff.color} border border-current/10`}>
                          {diff.label}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-gray-500">
                        {problem.testCaseCount} test case{problem.testCaseCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="hidden sm:inline text-xs text-gray-600">
                        {formatDate(problem.createdAt)}
                      </span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-gray-500 group-hover:border-blue-500/30 group-hover:text-blue-400 transition-all duration-200 group-hover:bg-blue-500/10">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function StudentProblemsPage() {
  return (
    <StudentRoute>
      <ProblemsList />
    </StudentRoute>
  );
}
