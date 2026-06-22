import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { format } from "date-fns";

export default async function TeacherStudents() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const students = await prisma.student.findMany({
    include: {
      user: true,
      department: true,
    },
    orderBy: { rollNumber: "asc" },
  });

  const data = students.map((s) => ({
    rollNumber: s.rollNumber,
    name: s.user.name,
    department: s.department.name,
    semester: s.semester,
    joined: format(s.createdAt, "yyyy-MM-dd"),
  }));

  const columns = [
    { key: "rollNumber", label: "Roll Number" },
    { key: "name", label: "Name" },
    { key: "department", label: "Department" },
    { key: "semester", label: "Semester" },
    { key: "joined", label: "Joined" },
  ];

  return (
    <div>
      <PageHeader title="Students" />
      <DataTable columns={columns} data={data} />
    </div>
  );
}
