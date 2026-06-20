'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        localStorage.removeItem('token');
        router.replace('/login');
        return;
      }

      // JWT payload is Base64URL-encoded (RFC 7519), not standard Base64.
      const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded =
        base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4);
      const payload = JSON.parse(atob(padded));

      if (payload.role === 'TEACHER') {
        router.replace('/teacher');
      } else {
        router.replace('/student/problems');
      }
    } catch {
      localStorage.removeItem('token');
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}
