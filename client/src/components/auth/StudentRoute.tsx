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
 * Parses a JWT token (Base64URL-aware) and returns the decoded payload.
 * Returns null if the token is missing, malformed, or expired.
 */
function decodeToken(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // JWT payload is Base64URL-encoded (RFC 7519), not standard Base64.
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
 * StudentRoute protects child components by verifying the user has a valid
 * STUDENT JWT in localStorage. If not authenticated or not a student,
 * the user is redirected to /login.
 */
export default function StudentRoute({
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

    if (decoded.role !== 'STUDENT') {
      router.replace('/login');
      return;
    }

    setAuthorized(true);
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
          <p className="text-sm text-gray-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
