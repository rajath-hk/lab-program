"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";

interface Program {
  id: string;
  title: string;
  description: string;
  unlockDate: string;
  deadline?: string | null;
}

export default function EditProgram() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [form, setForm] = useState({ title: "", description: "", unlockDate: "", deadline: "" });
  const [error, setError] = useState<string>("");

  const fetchProgram = async () => {
    const res = await fetch(`/api/teacher/programs/${id}`);
    if (res.ok) {
      const data = await res.json();
      setProgram(data);
      setForm({
        title: data.title,
        description: data.description,
        unlockDate: data.unlockDate?.split("T")[0] || "",
        deadline: data.deadline?.split("T")[0] || "",
      });
    }
  };

  useEffect(() => {
    fetchProgram();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const payload: any = {};
    if (form.title) payload.title = form.title;
    if (form.description) payload.description = form.description;
    if (form.unlockDate) payload.unlockDate = form.unlockDate;
    if (form.deadline) payload.deadline = form.deadline;

    const res = await fetch(`/api/teacher/programs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error?.[0]?.message || "Failed to update");
      return;
    }
    alert("Program updated");
    router.push("/teacher/programs");
  };

  if (!program) return <p>Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Edit Program</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="title">Title</label>
          <Input id="title" name="title" value={form.title} onChange={handleChange} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="description">Description</label>
          <Textarea id="description" name="description" value={form.description} onChange={handleChange} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="unlockDate">Unlock Date</label>
          <Input type="date" id="unlockDate" name="unlockDate" value={form.unlockDate} onChange={handleChange} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="deadline">Deadline (optional)</label>
          <Input type="date" id="deadline" name="deadline" value={form.deadline} onChange={handleChange} />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex space-x-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </div>
  );
}
