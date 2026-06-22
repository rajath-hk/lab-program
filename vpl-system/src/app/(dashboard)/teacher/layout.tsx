"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";

const sections = [
  { name: "Dashboard", href: "/teacher" },
  { name: "My Programs", href: "/teacher/programs" },
  { name: "Review Submissions", href: "/teacher/submissions" },
  { name: "Students", href: "/teacher/students" },
  { name: "Settings", href: "/teacher/settings" },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  // Teacher info (name & employeeId)
  const teacherName = session?.user?.name ?? "Teacher";
  // employeeId not directly on session; fetch via API? For now placeholder
  const employeeId = "EMP001"; // could be fetched server‑side later

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col bg-[#052e16] text-white p-4">
        <h2 className="text-xl font-bold mb-6">VPL Teacher</h2>
        <nav className="flex-1 space-y-2">
          {sections.map((s) => {
            const active = pathname === s.href || pathname.startsWith(s.href + "/");
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`block rounded px-3 py-2 hover:bg-[#064c2d] ${active ? "bg-[#064c2d]" : ""}`}
              >
                {s.name}
              </Link>
            );
          })}
        </nav>
        {/* Footer */}
        <div className="border-t border-white/30 pt-4">
          <p className="text-sm mb-1">Signed in as</p>
          <p className="font-medium">{teacherName}</p>
          <p className="text-sm">{employeeId}</p>
          <button
            onClick={handleLogout}
            className="mt-2 w-full rounded bg-red-600 hover:bg-red-700 px-3 py-1 text-sm"
          >
            Logout
          </button>
        </div>
      </aside>
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-8">
        {children}
      </main>
    </div>
  );
}
