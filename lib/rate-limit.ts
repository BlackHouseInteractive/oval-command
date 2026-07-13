import { prisma } from '@/lib/prisma'

/**
 * Fixed-window rate limit backed by RateLimitBucket. A single atomic
 * upsert (INSERT ... ON CONFLICT) rather than a read-then-write from
 * Prisma's query builder — concurrent requests for the same key would
 * otherwise race between reading the old count and writing the
 * incremented one, letting a burst slip past the limit.
 *
 * Returns true if the request is allowed, false if it should be rejected.
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" AS b (key, "windowStart", count)
    VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN b."windowStart" > now() - (${windowSeconds}::int * interval '1 second')
        THEN b.count + 1
        ELSE 1
      END,
      "windowStart" = CASE
        WHEN b."windowStart" > now() - (${windowSeconds}::int * interval '1 second')
        THEN b."windowStart"
        ELSE now()
      END
    RETURNING count;
  `
  const count = rows[0]?.count ?? 1
  return count <= limit
}

/**
 * Best-effort client IP from Vercel's forwarded-for header — falls back to
 * a shared bucket if absent (e.g. local dev), which is intentionally
 * conservative rather than unlimited. Takes a headers-like object rather
 * than a full Request so both route handlers (`req.headers`) and Server
 * Actions (`await headers()` from next/headers) can call this the same way.
 */
export function getClientIp(headers: { get(name: string): string | null }): string {
  const forwardedFor = headers.get('x-forwarded-for')
  return forwardedFor?.split(',')[0]?.trim() ?? 'unknown'
}
