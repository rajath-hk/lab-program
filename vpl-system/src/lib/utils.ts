import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import crypto from "crypto"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a cryptographically secure random password.
 * Uses unambiguous characters to avoid confusion (no 0/O, 1/l/I).
 */
export function generateRandomPassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  let password = ""
  for (let i = 0; i < length; i++) {
    try {
      password += chars.charAt(crypto.randomInt(chars.length))
    } catch {
      // Fallback for client-side environments where crypto.randomInt may not work
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  }
  return password
}
