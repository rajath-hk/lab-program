"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, Plus, Edit, Trash2 } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getProgramStatus } from "@/lib/programStatus";
import { format } from "date-fns";
import Link from "next/link";

interface Program {
  id: string;
  title: string;
  description: string;
  unlockDate: string; // ISO
  deadline?: string | null;
  questionsCount: number;
}

export default function TeacherPrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    unlockDate: "",
    deadline: "",
  });
  const [error, setError] = useState<string>("");

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/programs");
      if (!res.ok) throw new Error("Failed to load programs");
      const data = await res.json();
      setPrograms(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // basic client validation
    if (!form.title || !form.description || !form.unlockDate) {
      setError("Please fill required fields");
      return;
    }
    try {
      const res = await fetch("/api/teacher/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error?.[0]?.message || "Failed to create program");
        return;
      }
      await fetchPrograms();
      setShowModal(false);
      setForm({ title: "", description: "", unlockDate: "", deadline: "" });
      alert("Program created successfully");
    } catch (e) {
      console.error(e);
      setError("Unexpected error");
    }
  };

  const statusBadge = (prog: Program) => {
    const status = getProgramStatus(new Date(prog.unlockDate), prog.deadline ? new Date(prog.deadline) : null);
    const colors: Record<string, string> = {
      LOCKED: "bg-gray-400",
      ACTIVE: "bg-green-600",
      ENDED: "bg-red-600",
    };
    return (
      <span className={`rounded px-2 py-1 text-xs text-white ${colors[status]}`}> {status} </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Programs</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Program
        </Button>
      </div>

      {/* Programs Grid */}
      {loading ? (
        <p>Loading...</p>
      ) : programs.length === 0 ? (
        <div className="text-center py-8">
          <p className="mb-4">No programs yet.</p>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create your first program
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <Card key={p.id} className="flex flex-col justify-between">
              <CardHeader>
                <h3 className="text-lg font-semibold">{p.title}</h3>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm mb-2 line-clamp-2">{p.description}</p>
                <div className="flex items-center space-x-2 text-xs text-gray-600 mb-2">
                  <Calendar size={14} />
                  <span>{format(new Date(p.unlockDate), "yyyy-MM-dd")}</span>
                </div>
                {p.deadline && (
                  <div className="flex items-center space-x-2 text-xs text-gray-600 mb-2">
                    <Clock size={14} />
                    <span>{format(new Date(p.deadline), "yyyy-MM-dd")}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-sm">
                  <span>Questions: {p.questionsCount}</span>
                  {statusBadge(p)}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Link
                  href={`/teacher/programs/${p.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Manage Questions
                </Link>
                <Link href={`/teacher/programs/${p.id}/edit`} className="text-sm text-primary hover:underline">
                  Edit
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Program Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold mb-4">Create Program</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="title">
                  Title
                </label>
                <Input id="title" name="title" value={form.title} onChange={handleInputChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="description">
                  Description
                </label>
                <Textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="unlockDate">
                  Unlock Date
                </label>
                <Input type="date" id="unlockDate" name="unlockDate" value={form.unlockDate} onChange={handleInputChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="deadline">
                  Deadline (optional)
                </label>
                <Input type="date" id="deadline" name="deadline" value={form.deadline} onChange={handleInputChange} />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
