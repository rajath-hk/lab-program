'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DecodedToken {
  id: string;
  email: string;
  role: 'STUDENT' | 'TEACHER';
  iat: number;
  exp: number;
}

/**
 * Parses a JWT token and returns the decoded payload.
 * Returns null if the token is missing, malformed, or expired.
 */
function decodeToken(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // JWT payload is Base64URL-encoded (RFC 7519), not standard Base64.
    // Convert Base64URL to Base64 before decoding.
    const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded =
      base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload as DecodedToken;
  } catch {
    return null;
  }
}

/**
 * TeacherRoute protects child components by verifying the user has a valid
 * TEACHER JWT in localStorage. If not authenticated or not a teacher,
 * the user is redirected to /login.
 */
export default function TeacherRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      router.replace('/login');
      return;
    }

    const decoded = decodeToken(token);

    if (!decoded) {
      localStorage.removeItem('token');
      router.replace('/login');
      return;
    }

    if (decoded.role !== 'TEACHER') {
      router.replace('/login');
      return;
    }

    setAuthorized(true);
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
