'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Code2, LogOut, Loader2 } from 'lucide-react';
import StudentRoute from '@/components/auth/StudentRoute';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ProblemListItem {
  id: string;
  title: string;
  testCaseCount: number;
  createdAt: string;
}

function ProblemsList() {
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Code2 className="h-6 w-6 text-blue-400" />
            <h1 className="text-lg font-bold text-white">MCA Lab Portal</h1>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Coding Problems</h2>
          <p className="mt-1 text-sm text-gray-400">
            Select a problem to start coding
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-800 bg-red-900/20 p-6 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={fetchProblems}
              className="mt-3 text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
            >
              Try again
            </button>
          </div>
        ) : problems.length === 0 ? (
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
            <Code2 className="mx-auto mb-4 h-10 w-10 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-300">
              No problems available
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Check back later when your instructor adds problems.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {problems.map((problem) => (
              <Link
                key={problem.id}
                href={`/student/problem/${problem.id}`}
                className="group block rounded-lg border border-gray-800 bg-gray-900 p-5 transition-all hover:border-blue-500/50 hover:bg-gray-800/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {problem.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {problem.testCaseCount} public test case{problem.testCaseCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-gray-600">
                    {formatDate(problem.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
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
