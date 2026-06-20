'use client';

import { useState, useEffect, useCallback } from 'react';
import StudentRoute from '@/components/auth/StudentRoute';
import { Loader2, Code2, CheckCircle2, XCircle, Clock, TrendingUp, BarChart3, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function StatsDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_URL}/api/student/problems`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/student/problems')} className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">My Progress</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track your coding journey</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Available Problems', value: stats?.problems?.length || 0, icon: Code2, color: 'text-blue-400 bg-blue-900/30' },
            { label: 'Total Attempts', value: '-', icon: BarChart3, color: 'text-purple-400 bg-purple-900/30' },
            { label: 'Best Streak', value: '-', icon: TrendingUp, color: 'text-green-400 bg-green-900/30' },
            { label: 'Time Spent', value: '-', icon: Clock, color: 'text-yellow-400 bg-yellow-900/30' },
          ].map(card => (
            <div key={card.label} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className={`rounded-lg p-1.5 w-fit mb-3 ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Available Problems */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-sm font-semibold mb-4">Available Problems</h2>
          <div className="space-y-2">
            {(stats?.problems || []).map((p: any) => (
              <button key={p.id} onClick={() => router.push(`/student/problem/${p.id}`)}
                className="w-full flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-4 py-3 hover:border-blue-500/50 transition-colors text-left">
                <span className="text-sm text-gray-300">{p.title}</span>
                <span className="text-xs text-gray-500">{p.testCaseCount} test cases</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function StudentStatsPage() {
  return (
    <StudentRoute>
      <StatsDashboard />
    </StudentRoute>
  );
}
