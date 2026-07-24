/**
 * In-memory sliding window rate limiter for the VPL system.
 *
 * Designed for a single-server college lab setup (~50 PCs).
 * No external dependencies (Redis not needed).
 *
 * On server restart all counters reset — acceptable for a lab environment.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateLimitConfig {
  /** Size of the sliding window in milliseconds. */
  windowMs: number
  /** Maximum number of requests allowed within the window. */
  max: number
}

interface RateLimitResult {
  /** Whether the request is allowed through. */
  allowed: boolean
  /** Seconds until the caller should retry (only present when `allowed` is false). */
  retryAfter?: number
}

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

/**
 * Sliding-window store.
 * Key: `${ip}:${route}`  →  Value: sorted array of request timestamps.
 */
const requestStore = new Map<string, number[]>()

/**
 * Concurrent-connection store.
 * Key: `${ip}:${route}`  →  Value: array of connection-start timestamps.
 *
 * Because Next.js middleware cannot detect when a streaming response
 * finishes, we approximate "concurrent" with a TTL: a connection is
 * considered active for `ttlMs` after it starts.
 */
const concurrentStore = new Map<string, number[]>()

// ---------------------------------------------------------------------------
// Periodic cleanup (prevents unbounded memory growth)
// ---------------------------------------------------------------------------

/** Run cleanup at most once every this many milliseconds. */
const CLEANUP_INTERVAL_MS = 60_000

/** Remove entries whose timestamps are older than this (safety upper bound). */
const CLEANUP_CUTOFF_MS = 10 * 60_000 // 10 minutes

let lastCleanup = 0

/**
 * Iterate both stores and drop timestamps that are older than the cutoff,
 * deleting keys that have no remaining timestamps.
 */
function cleanupExpired(): void {
  const cutoff = Date.now() - CLEANUP_CUTOFF_MS

  for (const store of [requestStore, concurrentStore]) {
    for (const [key, timestamps] of store) {
      const valid = timestamps.filter((t) => t > cutoff)
      if (valid.length === 0) {
        store.delete(key)
      } else if (valid.length !== timestamps.length) {
        store.set(key, valid)
      }
    }
  }

  lastCleanup = Date.now()
}

/** Run cleanup only if enough time has elapsed since the last run. */
function maybeCleanup(): void {
  if (Date.now() - lastCleanup > CLEANUP_INTERVAL_MS) {
    cleanupExpired()
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sliding-window rate limit check.
 *
 * Tracks the number of requests from `ip` for `route` within a rolling
 * `config.windowMs` window. If the count is at or above `config.max` the
 * request is rejected and `retryAfter` (seconds) tells the caller when the
 * oldest request will fall out of the window.
 *
 * @param ip    Client IP address.
 * @param route Logical route identifier (e.g. `"/api/execute"`).
 * @param config `{ windowMs, max }` configuration.
 */
export function checkRateLimit(
  ip: string,
  route: string,
  config: RateLimitConfig,
): RateLimitResult {
  maybeCleanup()

  const key = `${ip}:${route}`
  const now = Date.now()
  const windowStart = now - config.windowMs

  // Keep only timestamps that fall inside the current window.
  const timestamps = (requestStore.get(key) ?? []).filter((t) => t > windowStart)

  if (timestamps.length >= config.max) {
    const oldest = timestamps[0]
    const retryAfter = Math.max(
      1,
      Math.ceil((oldest + config.windowMs - now) / 1000),
    )
    // Save the cleaned-up list (without adding the rejected request).
    requestStore.set(key, timestamps)
    return { allowed: false, retryAfter }
  }

  timestamps.push(now)
  requestStore.set(key, timestamps)
  return { allowed: true }
}

/**
 * Concurrent-connection limit check (TTL-based approximation).
 *
 * Each call records a "connection start" timestamp. A connection is
 * considered active for `ttlMs` milliseconds, after which it auto-expires.
 * If the number of active connections is at or above `maxConcurrent` the
 * request is rejected.
 *
 * This is the best we can do from middleware alone, since we cannot detect
 * when a streaming response actually closes. For SSE endpoints choose a TTL
 * that matches the expected maximum stream duration.
 *
 * @param ip            Client IP address.
 * @param route         Logical route identifier.
 * @param maxConcurrent Maximum number of simultaneous connections per IP.
 * @param ttlMs         How long a connection is considered active (ms).
 */
export function checkConcurrentLimit(
  ip: string,
  route: string,
  maxConcurrent: number,
  ttlMs: number,
): RateLimitResult {
  maybeCleanup()

  const key = `${ip}:${route}`
  const now = Date.now()

  // Drop connections whose TTL has expired.
  const active = (concurrentStore.get(key) ?? []).filter((t) => t > now - ttlMs)

  if (active.length >= maxConcurrent) {
    const oldest = active[0]
    const retryAfter = Math.max(1, Math.ceil((oldest + ttlMs - now) / 1000))
    concurrentStore.set(key, active)
    return { allowed: false, retryAfter }
  }

  active.push(now)
  concurrentStore.set(key, active)
  return { allowed: true }
}
