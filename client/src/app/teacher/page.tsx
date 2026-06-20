'use client';

import { useState, useEffect, useCallback } from 'react';
import TeacherRoute from '@/components/auth/TeacherRoute';

// --- Types ---

interface Problem {
  id: string;
  title: string;
  description: string;
  boilerplateCode: string;
  testCaseCount: number;
  hintCount: number;
  submissionCount: number;
  createdAt: string;
  updatedAt: string;
}

interface UploadResult {
  message: string;
  successCount: number;
  errors: { row: number; message: string }[];
}

// --- API Helpers ---

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// --- Teacher Dashboard Component ---

function TeacherDashboard() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  // --- Fetch problems ---

  const fetchProblems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/teacher/problems`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.error || `Failed to fetch problems (HTTP ${response.status})`
        );
      }

      const data = await response.json();
      setProblems(data.problems);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load problems'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  // --- Upload handler ---

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadResult(null);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/teacher/problems/bulk`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `Upload failed (HTTP ${response.status})`);
      }

      setUploadResult(data);
      setSelectedFile(null);

      // Refresh the problem list
      fetchProblems();
    } catch (err) {
      setUploadResult({
        message: err instanceof Error ? err.message : 'Upload failed',
        successCount: 0,
        errors: [],
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  // --- Format date ---

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Teacher Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage coding problems for your lab
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/teacher/create"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900">
              + New Problem
            </a>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation Cards */}
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: '/teacher/create', label: 'Create Problem', desc: 'Rich problem editor with test cases & hints', color: 'border-blue-200 hover:border-blue-400 bg-gradient-to-br from-blue-50 to-white' },
            { href: '/teacher/analytics', label: 'Analytics', desc: 'Class performance, trends & student insights', color: 'border-purple-200 hover:border-purple-400 bg-gradient-to-br from-purple-50 to-white' },
            { href: '/teacher/submissions', label: 'Review Submissions', desc: 'Grade submissions & help requests', color: 'border-green-200 hover:border-green-400 bg-gradient-to-br from-green-50 to-white' },
            { href: '/teacher', label: 'Bulk Upload', desc: 'Upload problems via Excel or CSV', color: 'border-orange-200 hover:border-orange-400 bg-gradient-to-br from-orange-50 to-white' },
          ].map(card => (
            <a key={card.href} href={card.href}
              className={`rounded-xl border ${card.color} p-5 shadow-sm transition-all hover:shadow-md`}>
              <h3 className="text-sm font-semibold text-gray-900">{card.label}</h3>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">{card.desc}</p>
            </a>
          ))}
        </div>

        {/* Upload Section */}
        <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Bulk Upload Problems
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Upload an Excel (.xlsx) or CSV file with columns:{' '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-700">
              Title, Description, BoilerplateCode, TestCases, Hints
            </code>
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select File
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100 transition-colors cursor-pointer"
              />
            </div>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className={`inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-all ${
                !selectedFile || uploading
                  ? 'cursor-not-allowed bg-gray-300'
                  : 'bg-primary-600 hover:bg-primary-700 shadow-sm hover:shadow'
              }`}
            >
              {uploading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {uploading ? 'Uploading...' : 'Upload & Create'}
            </button>
          </div>

          {/* Upload result messages */}
          {uploadResult && (
            <div
              className={`mt-4 rounded-lg border p-4 ${
                uploadResult.successCount > 0
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  uploadResult.successCount > 0
                    ? 'text-green-800'
                    : 'text-red-800'
                }`}
              >
                {uploadResult.message}
              </p>
              {uploadResult.errors.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {uploadResult.errors.map((err, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-red-600"
                    >
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* Problems List Section */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Your Problems
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {problems.length} problem{problems.length !== 1 ? 's' : ''} created
                </p>
              </div>
              <a href="/teacher/create" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors shadow-sm">
                + Create New
              </a>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
                <p className="text-sm text-gray-500">Loading problems...</p>
              </div>
            </div>
          ) : error ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={fetchProblems}
                className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors"
              >
                Try again
              </button>
            </div>
          ) : problems.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 11.625l2.25-2.25M12 11.625l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900">
                No problems yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Upload an Excel or CSV file to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Test Cases
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Hints
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Submissions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {problems.map((problem) => (
                    <tr
                      key={problem.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="max-w-xs truncate text-sm font-medium text-gray-900">
                          {problem.title}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {problem.testCaseCount}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                          {problem.hintCount}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                          {problem.submissionCount}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {formatDate(problem.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// --- Wrapped Export ---

export default function TeacherPage() {
  return (
    <TeacherRoute>
      <TeacherDashboard />
    </TeacherRoute>
  );
}
