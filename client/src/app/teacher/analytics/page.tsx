'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
} from 'recharts';
import { Loader2, BookOpen, Code2, Users, AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

interface OverviewStats {
  totalProblems: number;
  totalSubmissions: number;
  totalStudents: number;
  totalViolations: number;
  acceptanceRate: number;
}

interface Trend {
  date: string;
  total: number;
  accepted: number;
}

interface ProblemPerf {
  id: string;
  title: string;
  totalSubmissions: number;
  acceptedSubmissions: number;
  passRate: number;
}

interface StudentPerf {
  id: string;
  name: string;
  email: string;
  totalSubmissions: number;
  acceptedSubmissions: number;
  violations: number;
  lastSubmission: string | null;
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [problems, setProblems] = useState<ProblemPerf[]>([]);
  const [students, setStudents] = useState<StudentPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const [o, t, p, s] = await Promise.all([
        fetch(`${API_URL}/api/teacher/analytics/overview`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/api/teacher/analytics/submission-trends?days=${days}`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/api/teacher/analytics/problem-performance`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/api/teacher/analytics/student-performance`, { headers }).then(r => r.json()),
      ]);
      setOverview(o);
      setTrends(t.trends || []);
      setProblems(p.problems || []);
      setStudents(s.students || []);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <h1 className="text-xl font-bold">Analytics Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Class performance and submission insights</p>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Problems', value: overview?.totalProblems, icon: BookOpen, color: 'text-blue-400 bg-blue-900/30' },
            { label: 'Submissions', value: overview?.totalSubmissions, icon: Code2, color: 'text-green-400 bg-green-900/30' },
            { label: 'Students', value: overview?.totalStudents, icon: Users, color: 'text-purple-400 bg-purple-900/30' },
            { label: 'Acceptance', value: `${overview?.acceptanceRate}%`, icon: CheckCircle, color: 'text-emerald-400 bg-emerald-900/30' },
            { label: 'Violations', value: overview?.totalViolations, icon: AlertTriangle, color: 'text-red-400 bg-red-900/30' },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`rounded-lg p-1.5 ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                </div>
                <span className="text-xs text-gray-500">{card.label}</span>
              </div>
              <p className="text-2xl font-bold">{card.value ?? '—'}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Submission Trends */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Submission Trends</h2>
              <select value={days} onChange={e => setDays(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300">
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="acceptedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, color: '#fff' }} />
                  <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#totalGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="accepted" stroke="#22c55e" fill="url(#acceptedGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Problem Performance */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="text-sm font-semibold mb-4">Problem Pass Rates</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={problems.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#6b7280' }} unit="%" />
                  <YAxis dataKey="title" type="category" width={120} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, color: '#fff' }} formatter={(val) => [`${val}%`, 'Pass Rate']} />
                  <Bar dataKey="passRate" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Student Performance Table */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold">Student Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium uppercase">Name</th>
                  <th className="text-center px-5 py-3 text-xs text-gray-500 font-medium uppercase">Submissions</th>
                  <th className="text-center px-5 py-3 text-xs text-gray-500 font-medium uppercase">Accepted</th>
                  <th className="text-center px-5 py-3 text-xs text-gray-500 font-medium uppercase">Pass Rate</th>
                  <th className="text-center px-5 py-3 text-xs text-gray-500 font-medium uppercase">Violations</th>
                  <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium uppercase">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {students.map((s) => {
                  const passRate = s.totalSubmissions > 0 ? Math.round((s.acceptedSubmissions / s.totalSubmissions) * 100) : 0;
                  return (
                    <tr key={s.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-sm text-white">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.email}</p>
                      </td>
                      <td className="text-center px-5 py-3 text-gray-300">{s.totalSubmissions}</td>
                      <td className="text-center px-5 py-3">
                        <span className="text-green-400">{s.acceptedSubmissions}</span>
                      </td>
                      <td className="text-center px-5 py-3">
                        <span className={`text-sm font-medium ${
                          passRate >= 70 ? 'text-green-400' : passRate >= 40 ? 'text-yellow-400' : 'text-red-400'
                        }`}>{passRate}%</span>
                      </td>
                      <td className="text-center px-5 py-3">
                        <span className={s.violations > 0 ? 'text-red-400' : 'text-gray-600'}>{s.violations}</span>
                      </td>
                      <td className="text-right px-5 py-3 text-xs text-gray-500">
                        {s.lastSubmission ? new Date(s.lastSubmission).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
