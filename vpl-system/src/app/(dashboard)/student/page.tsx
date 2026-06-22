import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function StudentPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const name = session.user.name ?? "Student";
  return <h1>Student Dashboard — Welcome, {name}</h1>;
}
