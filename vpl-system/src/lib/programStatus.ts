export type ProgramStatus = "LOCKED" | "ACTIVE" | "ENDED";

/**
 * Determine program status based on unlock date and optional deadline.
 * - today < unlockDate → LOCKED
 * - today >= unlockDate && (no deadline || today <= deadline) → ACTIVE
 * - deadline && today > deadline → ENDED
 */
export function getProgramStatus(unlockDate: Date, deadline?: Date | null): ProgramStatus {
  const now = new Date();
  // Reset time portion for comparison (ignore time of day)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const unlock = new Date(unlockDate.getFullYear(), unlockDate.getMonth(), unlockDate.getDate());

  if (today < unlock) return "LOCKED";
  if (deadline) {
    const d = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    if (today > d) return "ENDED";
  }
  return "ACTIVE";
}
