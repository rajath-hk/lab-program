import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: string; // Tailwind bg color for icon container
}

export function StatsCard({ title, value, icon, color = "bg-primary" }: StatsCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${color} text-white`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </div>
  );
}
