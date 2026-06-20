'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Search, CheckCircle, XCircle, ChevronDown } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Submission {
  id: string;
  status: string;
  languageId: number;
  executionTime: number | null;
  errorMessage: string | null;
  createdAt: string;
  sourceCode?: string;
  user: { id: string; name: string; email: string };
  problem: { id: string; title: string };
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  ACCEPTED: { label: 'Accepted', color: 'text-green-400 bg-green-900/30' },
  WRONG_ANSWER: { label: 'Wrong Answer', color: 'text-red-400 bg-red-900/30' },
  COMPILATION_ERROR: { label: 'Compile Error', color: 'text-yellow-400 bg-yellow-900/30' },
  RUNTIME_ERROR: { label: 'Runtime Error', color: 'text-orange-400 bg-orange-900/30' },
  PENDING: { label: 'Pending', color: 'text-gray-400 bg-gray-800' },
};

const LANG_MAP: Record<number, string> = { 62: 'Java', 71: 'Python', 54: 'C++', 63: 'JS' };

export default function SubmissionsReviewPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDropdown, setFilterDropdown] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    const token = localStorage.getItem('token');
    const url = `${API_URL}/api/teacher/submissions${filterStatus ? `?status=${filterStatus}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setSubmissions(data.submissions || []);
    }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const viewDetail = async (id: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/teacher/submissions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setSelected(data.submission);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/teacher/submissions/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    await fetchSubmissions();
    if (selected?.id === id) setSelected(null);
    setUpdating(null);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const FILTERS = [
    { value: '', label: 'All Statuses' },
    { value: 'ACCEPTED', label: 'Accepted' },
    { value: 'WRONG_ANSWER', label: 'Wrong Answer' },
    { value: 'COMPILATION_ERROR', label: 'Compilation Error' },
    { value: 'RUNTIME_ERROR', label: 'Runtime Error' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <h1 className="text-xl font-bold">Submission Review</h1>
        <p className="text-sm text-gray-400 mt-1">Review and manually grade student submissions</p>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Filter */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <button onClick={() => setFilterDropdown(!filterDropdown)}
              className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
              {FILTERS.find(f => f.value === filterStatus)?.label || 'Filter'}
              <ChevronDown className="h-3 w-3" />
            </button>
            {filterDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setFilterDropdown(false)} />
                <div className="absolute z-20 mt-1 w-48 rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
                  {FILTERS.map(f => (
                    <button key={f.value} onClick={() => { setFilterStatus(f.value); setFilterDropdown(false); }}
                      className="block w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 first:rounded-t-lg last:rounded-b-lg">
                      {f.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <span className="text-sm text-gray-500">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-400" /></div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">No submissions found</div>
            ) : (
              <div className="divide-y divide-gray-800 max-h-[70vh] overflow-y-auto">
                {submissions.map(s => {
                  const badge = STATUS_MAP[s.status] || STATUS_MAP.PENDING;
                  return (
                    <button key={s.id} onClick={() => viewDetail(s.id)}
                      className={`w-full text-left px-5 py-3 hover:bg-gray-800/30 transition-colors ${selected?.id === s.id ? 'bg-gray-800/50' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">{s.user.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                      </div>
                      <p className="text-xs text-gray-500">{s.problem.title} · {LANG_MAP[s.languageId] || '?'}</p>
                      <p className="text-[10px] text-gray-600 mt-1">{formatDate(s.createdAt)}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            {selected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{selected.user.name}</h3>
                    <p className="text-xs text-gray-500">{selected.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateStatus(selected.id, 'ACCEPTED')} disabled={updating === selected.id}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
                      {updating === selected.id ? '...' : 'Accept'}
                    </button>
                    <button onClick={() => updateStatus(selected.id, 'WRONG_ANSWER')} disabled={updating === selected.id}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50">
                      Reject
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Problem: <span className="text-gray-300">{selected.problem.title}</span></p>
                  <p>Status: <span className={`font-medium ${(STATUS_MAP[selected.status] || STATUS_MAP.PENDING).color.split(' ')[0]}`}>{selected.status}</span></p>
                  {selected.executionTime && <p>Time: {selected.executionTime}s</p>}
                </div>

                {selected.sourceCode && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Source Code:</p>
                    <pre className="rounded-lg bg-gray-950 border border-gray-800 p-3 text-xs text-gray-300 font-mono overflow-x-auto max-h-60 overflow-y-auto">
                      {selected.sourceCode}
                    </pre>
                  </div>
                )}

                {selected.errorMessage && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Error:</p>
                    <pre className="rounded-lg bg-red-950/30 border border-red-800/40 p-3 text-xs text-red-300 font-mono overflow-x-auto">
                      {selected.errorMessage}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="h-8 w-8 text-gray-700 mb-2" />
                <p className="text-sm text-gray-500">Select a submission to review</p>
              </div>
            )}
          </div>
        </div>

        {/* Help Requests Section */}
        <div className="mt-8 rounded-xl border border-yellow-800/30 bg-yellow-950/20 p-5">
          <h2 className="text-sm font-semibold text-yellow-300 mb-3">🆘 Pending Help Requests</h2>
          <HelpRequestList />
        </div>
      </main>
    </div>
  );
}

function HelpRequestList() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHelpRequests = async () => {
      const token = localStorage.getItem('token');
      const res = await window.fetch(`${API_URL}/api/teacher/help-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.helpRequests || []);
      }
      setLoading(false);
    };
    loadHelpRequests();
  }, []);

  const resolve = async (id: string) => {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/teacher/help-requests/${id}/resolve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    setRequests(requests.filter(r => r.id !== id));
  };

  if (loading) return <div className="text-sm text-gray-500">Loading...</div>;
  if (requests.length === 0) return <div className="text-sm text-gray-500 italic">No pending requests</div>;

  return (
    <div className="space-y-2">
      {requests.map((r: any) => (
        <div key={r.id} className="flex items-center justify-between rounded-lg border border-yellow-800/30 bg-gray-900 px-4 py-3">
          <div>
            <p className="text-sm text-gray-200">{r.user.name} needs help with <span className="text-yellow-300">{r.problem.title}</span></p>
            <p className="text-xs text-gray-500 mt-0.5">{r.errorMessage?.replace('Help requested: ', '')}</p>
          </div>
          <button onClick={() => resolve(r.id)}
            className="rounded-lg bg-yellow-600 px-3 py-1 text-xs font-medium hover:bg-yellow-700 transition-colors">
            Resolve
          </button>
        </div>
      ))}
    </div>
  );
}
