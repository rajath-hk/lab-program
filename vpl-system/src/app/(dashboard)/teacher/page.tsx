import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatsCard } from "@/components/shared/StatsCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Calendar, Clock, List } from "lucide-react";
import { getProgramStatus } from "@/lib/programStatus";
import { format } from "date-fns";

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) return null; // fallback – middleware will redirect

  // Find the teacher record
  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    include: { programs: { include: { questions: true } } },
  });
  if (!teacher) return null;

  const totalPrograms = teacher.programs.length;
  const totalQuestions = teacher.programs.reduce((sum, p) => sum + p.questions.length, 0);

  // Submissions status
  const submissions = await prisma.submission.findMany({
    where: { question: { program: { teacherId: teacher.id } } },
    select: { status: true },
  });
  const pending = submissions.filter((s) => s.status === "PENDING").length;
  const approved = submissions.filter((s) => s.status === "APPROVED").length;

  // Recent Programs (last 5)
  const recentPrograms = await prisma.program.findMany({
    where: { teacherId: teacher.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { questions: true },
  });

  // Recent Submissions (last 5)
  const recentSubmissions = await prisma.submission.findMany({
    where: { question: { program: { teacherId: teacher.id } } },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      student: { include: { user: true } },
      question: { include: { program: true } },
    },
  });

  return (
    <div>
      <PageHeader title="Teacher Dashboard" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard title="Programs" value={totalPrograms} icon={<List size={20} />} />
        <StatsCard title="Questions" value={totalQuestions} icon={<List size={20} />} />
        <StatsCard title="Pending" value={pending} icon={<Clock size={20} />} />
        <StatsCard title="Approved" value={approved} icon={<Calendar size={20} />} />
      </div>

      {/* Recent Programs */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Recent Programs</h2>
        <DataTable
          columns={[
            { key: "title", label: "Title" },
            { key: "questionsCount", label: "Questions" },
            { key: "unlockDate", label: "Unlock Date" },
            { key: "deadline", label: "Deadline" },
            { key: "status", label: "Status" },
          ]}
          data={recentPrograms.map((p) => ({
            title: p.title,
            questionsCount: p.questions.length,
            unlockDate: format(p.unlockDate, "yyyy-MM-dd"),
            deadline: p.deadline ? format(p.deadline, "yyyy-MM-dd") : "-",
            status: getProgramStatus(p.unlockDate, p.deadline),
          }))}
        />
      </section>

      {/* Recent Submissions */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Submissions</h2>
        <DataTable
          columns={[
            { key: "rollNumber", label: "Roll" },
            { key: "questionTitle", label: "Question" },
            { key: "programTitle", label: "Program" },
            { key: "submittedAt", label: "Submitted At" },
          ]}
          data={recentSubmissions.map((s) => ({
            rollNumber: s.student.rollNumber,
            questionTitle: s.question.title,
            programTitle: s.question.program.title,
            submittedAt: format(s.createdAt, "yyyy-MM-dd HH:mm"),
          }))}
        />
      </section>
    </div>
  );
}
