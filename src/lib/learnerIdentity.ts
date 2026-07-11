/**
 * Stable learner IDs for EverOS + Butterbase.
 * Signed-in → Butterbase user.id
 * Guest → localStorage guest_* (survives refresh; not shared across devices)
 */

const GUEST_KEY = 'combo:guest_user_id'

export function getOrCreateGuestUserId(): string {
  if (typeof window === 'undefined') return 'anonymous'
  try {
    const existing = localStorage.getItem(GUEST_KEY)
    if (existing && existing.startsWith('guest_')) return existing
    const id = `guest_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
    localStorage.setItem(GUEST_KEY, id)
    return id
  } catch {
    return 'anonymous'
  }
}

/** Prefer auth user id; fall back to guest id for client callers. */
export function resolveClientUserId(authUserId?: string | null): string {
  if (authUserId) return authUserId
  return getOrCreateGuestUserId()
}

export function institutionDomainFromEmail(email?: string | null): string | undefined {
  if (!email || !email.includes('@')) return undefined
  return email.split('@')[1]?.toLowerCase()
}
