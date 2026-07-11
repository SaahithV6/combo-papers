import type { NextRequest } from 'next/server'

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

export function checkRateLimit(
  request: NextRequest,
  scope: string,
  options: { limit: number; windowMs: number }
) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const identity = forwarded || request.headers.get('x-real-ip') || 'local'
  const key = `${scope}:${identity}`
  const now = Date.now()
  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs })
    return { allowed: true, remaining: options.limit - 1, retryAfter: 0 }
  }

  if (current.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((current.resetAt - now) / 1000),
    }
  }

  current.count += 1
  return { allowed: true, remaining: options.limit - current.count, retryAfter: 0 }
}
