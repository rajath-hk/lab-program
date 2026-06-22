import * as React from "react";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border bg-white p-6 shadow-sm ${className || ""}`}>{children}</div>;
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-4 text-lg font-medium ${className || ""}`}>{children}</div>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`mt-4 flex justify-end ${className || ""}`}>{children}</div>;
}
