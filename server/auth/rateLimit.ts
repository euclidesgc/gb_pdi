/**
 * In-memory fixed-window limiter (single API instance). Good enough to slow
 * down password guessing and e-mail flooding; resets when the process restarts.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>()
  private max: number
  private windowMs: number

  constructor(max: number, windowMs: number) {
    this.max = max
    this.windowMs = windowMs
  }

  /** Counts a hit for `key`; returns the seconds to wait when over the limit, else 0. */
  hit(key: string): number {
    const now = Date.now()
    if (this.hits.size > 10_000) {
      for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k)
    }
    const cur = this.hits.get(key)
    if (!cur || cur.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs })
      return 0
    }
    cur.count += 1
    return cur.count > this.max ? Math.ceil((cur.resetAt - now) / 1000) : 0
  }

  reset(key: string): void {
    this.hits.delete(key)
  }
}
