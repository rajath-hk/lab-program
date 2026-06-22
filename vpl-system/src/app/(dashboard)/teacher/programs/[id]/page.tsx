"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Plus, Edit, Trash2 } from "lucide-react";
import { getProgramStatus } from "@/lib/programStatus";
import { format } from "date-fns";

interface Question {
  id: string;
  title: string;
  description: string;
  starterCode?: string | null;
  languages: string[];
  orderNumber: number;
}

interface Program {
  id: string;
  title: string;
  description: string;
  unlockDate: string;
  deadline?: string | null;
  questions: Question[];
}

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    title: "",
    description: "",
    starterCode: "",
    languages: "C, C++, Java, Python, JavaScript",
  });
  const [error, setError] = useState<string>("");

  const fetchProgram = async () => {
    setLoading(true);
    const res = await fetch(`/api/teacher/programs/${id}`);
    if (res.ok) {
      const data = await res.json();
      setProgram(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProgram();
  }, [id]);

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setAddForm({ ...addForm, [e.target.name]: e.target.value });
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const languages = addForm.languages.split(",").map((l) => l.trim());
    const payload = {
      title: addForm.title,
      description: addForm.description,
      starterCode: addForm.starterCode || undefined,
      languages,
    };
    const res = await fetch(`/api/teacher/programs/${id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error?.[0]?.message || "Failed to add question");
      return;
    }
    await fetchProgram();
    setShowAddModal(false);
    setAddForm({ title: "", description: "", starterCode: "", languages: "C, C++, Java, Python, JavaScript" });
    alert("Question added");
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm("Delete this question?")) return;
    const res = await fetch(`/api/teacher/programs/${id}/questions/${questionId}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed to delete");
      return;
    }
    await fetchProgram();
  };

  if (loading) return <p>Loading...</p>;
  if (!program) return <p>Program not found.</p>;

  const status = getProgramStatus(new Date(program.unlockDate), program.deadline ? new Date(program.deadline) : null);
  const statusColors: Record<string, string> = { LOCKED: "bg-gray-400", ACTIVE: "bg-green-600", ENDED: "bg-red-600" };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{program.title}</h1>
        <Button onClick={() => router.back()} variant="outline">Back to Programs</Button>
      </div>
      <div className="mb-2 text-sm text-gray-600">
        <span className="mr-4">{program.description}</span>
        <span className="mr-2"><Calendar size={14} /> {format(new Date(program.unlockDate), "yyyy-MM-dd")}</span>
        {program.deadline && <span><Clock size={14} /> {format(new Date(program.deadline), "yyyy-MM-dd")}</span>}
        <span className={`ml-4 rounded px-2 py-1 text-xs text-white ${statusColors[status]}`}>{status}</span>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Questions ({program.questions.length})</h2>
        {program.questions.length < 10 && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Question
          </Button>
        )}
        {program.questions.length >= 10 && <p className="text-sm text-gray-500">Maximum 10 questions reached</p>}
      </div>

      {program.questions.length === 0 ? (
        <p>No questions yet.</p>
      ) : (
        <div className="space-y-4">
          {program.questions.map((q) => (
            <Card key={q.id}>
              <CardHeader>
                <div className="flex items-center">
                  <div className="text-2xl font-bold mr-4">{q.orderNumber}.</div>
                  <h3 className="text-lg font-semibold">{q.title}</h3>
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-2 mb-2">{q.description}</p>
                <p className="text-sm text-gray-500">Languages: {q.languages?.join(", ")}</p>
                {q.starterCode && (
                  <pre className="mt-2 bg-gray-100 p-2 rounded text-sm overflow-x-auto">{q.starterCode}</pre>
                )}
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                {/* Edit button could open edit modal (not implemented fully) */}
                <Button variant="outline" size="sm" onClick={() => alert('Edit not implemented')}>Edit</Button>
                <Button variant="destructive" size="sm" onClick={() => deleteQuestion(q.id)}>Delete</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-md p-6 relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">
              ✕
            </button>
            <h2 className="text-lg font-semibold mb-4">Add Question</h2>
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="title">Title</label>
                <Input id="title" name="title" value={addForm.title} onChange={handleAddChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="description">Description</label>
                <Textarea id="description" name="description" value={addForm.description} onChange={handleAddChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="starterCode">Starter Code</label>
                <Textarea id="starterCode" name="starterCode" value={addForm.starterCode} onChange={handleAddChange} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="languages">Languages (comma separated)</label>
                <Input id="languages" name="languages" value={addForm.languages} onChange={handleAddChange} />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
