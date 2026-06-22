import { ReactNode } from "react";

interface FormCardProps {
  title: string;
  children: ReactNode;
}

export function FormCard({ title, children }: FormCardProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {children}
    </div>
  );
}
