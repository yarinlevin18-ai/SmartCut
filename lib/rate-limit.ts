// Minimal in-memory token bucket rate limiter for Edge middleware.
//
// Threat model: a misbehaving client or unsophisticated scraper hammering a
// public endpoint. UUIDv4 tokens (122 bits entropy) make actual brute force
// infeasible, but a bored attacker can still waste DB calls and Vercel
// function invocations. This caps per-IP traffic to a sensible budget.
//
// Per-instance memory: this is NOT distributed. Each Edge runtime instance
// has its own Map, so the effective limit on a multi-instance deployment is
// roughly LIMIT × concurrent-instances. Acceptable for our threat model
// (single-instance flooders are blocked; truly distributed attacks would
// need Upstash/Redis upgrade — see TODO at bottom).

interface Bucket {
  count: number;
  resetAt: number; // epoch ms when the window resets
}

// Module-scoped Map persists across requests within a warm Edge instance.
const buckets = new Map<string, Bucket>();

// Eviction: on every fresh-bucket creation, with 1% probability sweep
// expired entries. Bounds memory without per-write cost.
function maybeSweep(now: number): void {
  if (Math.random() >= 0.01) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export interface RateLimitOptions {
  /** Unique key per limiter (combine with IP). */
  scope: string;
  /** Bucket key — typically the client IP. */
  key: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in ms. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the bucket resets (for Retry-After header). */
  retryAfterSec: number;
  /** How many of the budget remain after this request. */
  remaining: number;
}

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucketKey = `${opts.scope}|${opts.key}`;
  const existing = buckets.get(bucketKey);

  if (!existing || existing.resetAt < now) {
    maybeSweep(now);
    buckets.set(bucketKey, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, retryAfterSec: 0, remaining: opts.limit - 1 };
  }

  if (existing.count >= opts.limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    retryAfterSec: 0,
    remaining: opts.limit - existing.count,
  };
}

// Test-only — drains all buckets so smoke runs are deterministic.
export function __resetRateLimitBuckets(): void {
  buckets.clear();
}

// TODO: when Phase 3.2 traffic warrants it, swap to @upstash/ratelimit for
// distributed limits. Same interface, drop in here.
