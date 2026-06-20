import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MCA Lab Portal',
  description: 'MCA College Lab Portal - Code Submission & Evaluation Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
