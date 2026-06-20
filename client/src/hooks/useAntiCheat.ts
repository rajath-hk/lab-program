'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface UseAntiCheatOptions {
  problemId: string;
  /** Cooldown in ms between violation logs to prevent spam */
  cooldownMs?: number;
}

interface UseAntiCheatReturn {
  violationCount: number;
  isWarningVisible: boolean;
  acknowledgeWarning: () => void;
}

/**
 * useAntiCheat monitors browser focus events (visibilitychange and window.blur)
 * to detect tab-switching. When a violation is detected, it logs the infraction
 * to the backend and shows a warning state.
 */
export function useAntiCheat({
  problemId,
  cooldownMs = 3000,
}: UseAntiCheatOptions): UseAntiCheatReturn {
  const [violationCount, setViolationCount] = useState(0);
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const lastLogTimeRef = useRef(0);
  const cooldownActiveRef = useRef(false);

  const logViolation = useCallback(
    async (details: string) => {
      const now = Date.now();

      // Enforce cooldown to prevent spam
      if (now - lastLogTimeRef.current < cooldownMs) {
        return;
      }

      lastLogTimeRef.current = now;

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        await fetch(`${API_URL}/api/student/violation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            problemId,
            details,
          }),
        });
      } catch {
        // Silently fail — the violation is tracked locally regardless
      }
    },
    [problemId, cooldownMs]
  );

  const acknowledgeWarning = useCallback(() => {
    setIsWarningVisible(false);
  }, []);

  useEffect(() => {
    if (!problemId) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setViolationCount((prev) => prev + 1);
        setIsWarningVisible(true);
        logViolation('User switched tabs or minimized window');
      }
    };

    const handleWindowBlur = () => {
      // Avoid double-counting if visibilitychange already fired
      if (!document.hidden) {
        setViolationCount((prev) => prev + 1);
        setIsWarningVisible(true);
        logViolation('User clicked outside the application window');
      }
    };

    // Register event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    // Cleanup: remove event listeners on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [problemId, logViolation]);

  return {
    violationCount,
    isWarningVisible,
    acknowledgeWarning,
  };
}
