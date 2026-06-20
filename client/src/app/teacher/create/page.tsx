'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, X, ArrowLeft, Save, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface TestCaseEntry { input: string; expectedOutput: string; isHidden: boolean; }
interface HintEntry { regexPattern: string; hintMessage: string; }

export default function CreateProblemPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [boilerplateCode, setBoilerplateCode] = useState('');
  const [testCases, setTestCases] = useState<TestCaseEntry[]>([
    { input: '', expectedOutput: '', isHidden: false },
  ]);
  const [hintRules, setHintRules] = useState<HintEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);

  // Load existing problem for editing
  useEffect(() => {
    if (!editId) return;
    const load = async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/teacher/problems/${editId}/edit`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const p = data.problem;
      setTitle(p.title);
      setDescription(p.description);
      setBoilerplateCode(p.boilerplateCode || '');
      setTestCases(p.testCases.map((tc: any) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden,
      })));
      setHintRules(p.hintRules.map((hr: any) => ({
        regexPattern: hr.regexPattern,
        hintMessage: hr.hintMessage,
      })));
      setLoading(false);
    };
    load();
  }, [editId]);

  const addTestCase = () => setTestCases([...testCases, { input: '', expectedOutput: '', isHidden: false }]);
  const removeTestCase = (i: number) => testCases.length > 1 && setTestCases(testCases.filter((_, idx) => idx !== i));
  const updateTestCase = (i: number, field: keyof TestCaseEntry, value: any) => {
    const updated = [...testCases];
    (updated[i] as any)[field] = value;
    setTestCases(updated);
  };

  const addHint = () => setHintRules([...hintRules, { regexPattern: '', hintMessage: '' }]);
  const removeHint = (i: number) => setHintRules(hintRules.filter((_, idx) => idx !== i));
  const updateHint = (i: number, field: keyof HintEntry, value: string) => {
    const updated = [...hintRules];
    updated[i][field] = value;
    setHintRules(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = editId
        ? `${API_URL}/api/teacher/problems/${editId}`
        : `${API_URL}/api/teacher/problems/create`;
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          description,
          boilerplateCode,
          testCases: testCases.filter(tc => tc.input && tc.expectedOutput),
          hintRules: hintRules.filter(hr => hr.regexPattern && hr.hintMessage),
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      router.push('/teacher');
    } catch (err) {
      alert('Failed to save problem');
    } finally {
      setSaving(false);
    }
  };

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
        <button onClick={() => router.push('/teacher')} className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">{editId ? 'Edit Problem' : 'Create New Problem'}</h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Basic Information</h2>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} required
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. Sum of Two Numbers" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description (Markdown)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={8}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500 resize-y"
                placeholder={`# Problem Title\n\nDescribe the problem here...`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Boilerplate Code</label>
              <textarea value={boilerplateCode} onChange={e => setBoilerplateCode(e.target.value)} rows={6}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500 resize-y"
                placeholder="// Default code structure for students" />
            </div>
          </section>

          {/* Test Cases */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Test Cases</h2>
              <button type="button" onClick={addTestCase}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-700 transition-colors">
                <Plus className="h-3 w-3" /> Add Test Case
              </button>
            </div>
            <div className="space-y-3">
              {testCases.map((tc, i) => (
                <div key={i} className="rounded-lg border border-gray-700 bg-gray-900 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-400 uppercase">Case {i + 1}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                        <input type="checkbox" checked={tc.isHidden} onChange={e => updateTestCase(i, 'isHidden', e.target.checked)}
                          className="rounded border-gray-600 bg-gray-800 text-blue-600" />
                        Hidden
                      </label>
                      <button type="button" onClick={() => removeTestCase(i)}
                        className="text-gray-500 hover:text-red-400 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Input</label>
                      <textarea value={tc.input} onChange={e => updateTestCase(i, 'input', e.target.value)}
                        className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-500 resize-y"
                        rows={2} placeholder="e.g. 3 4" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Expected Output</label>
                      <textarea value={tc.expectedOutput} onChange={e => updateTestCase(i, 'expectedOutput', e.target.value)}
                        className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-500 resize-y"
                        rows={2} placeholder="e.g. 7" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Hint Rules */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Hint Rules (Regex)</h2>
              <button type="button" onClick={addHint}
                className="inline-flex items-center gap-1 rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-medium hover:bg-yellow-700 transition-colors">
                <Plus className="h-3 w-3" /> Add Hint
              </button>
            </div>
            {hintRules.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No hints configured. Hints are shown when error output matches a regex pattern.</p>
            ) : (
              <div className="space-y-3">
                {hintRules.map((hr, i) => (
                  <div key={i} className="rounded-lg border border-yellow-800/40 bg-yellow-950/20 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-yellow-400 uppercase">Hint {i + 1}</span>
                      <button type="button" onClick={() => removeHint(i)} className="text-gray-500 hover:text-red-400 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Regex Pattern</label>
                        <input value={hr.regexPattern} onChange={e => updateHint(i, 'regexPattern', e.target.value)}
                          className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-500"
                          placeholder="e.g. Exception|Error" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Hint Message</label>
                        <input value={hr.hintMessage} onChange={e => updateHint(i, 'hintMessage', e.target.value)}
                          className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                          placeholder="e.g. Check your input reading with Scanner.nextInt()" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <button type="button" onClick={() => router.push('/teacher')}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className={`inline-flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium transition-all ${
                saving ? 'bg-blue-800 text-blue-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : editId ? 'Update Problem' : 'Create Problem'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
