import type { NextRequest } from 'next/server'
import { getButterbase } from '@/lib/butterbase'

export class RequestAuthError extends Error {
  status: number

  constructor(message: string, status = 401) {
    super(message)
    this.name = 'RequestAuthError'
    this.status = status
  }
}

function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization')
  if (!header?.toLowerCase().startsWith('bearer ')) return null
  return header.slice(7).trim()
}

export async function authenticatedUser(request: NextRequest) {
  const token = bearerToken(request)
  if (!token) return null

  const client = getButterbase()
  if (!client) return null
  client.setAccessToken(token)
  const { data, error } = await client.auth.getUser()
  if (error || !data?.id) throw new RequestAuthError('Invalid or expired session')
  return data
}

/**
 * Signed-in IDs must be bound to a verified Butterbase token.
 * Pseudonymous guest IDs remain available for the zero-friction demo.
 */
export async function resolveRequestUserId(request: NextRequest, claimed?: string | null) {
  const user = await authenticatedUser(request)
  if (user) {
    if (claimed && claimed !== user.id) {
      throw new RequestAuthError('User identity does not match the authenticated session', 403)
    }
    return { userId: user.id, email: user.email, authenticated: true }
  }

  const guestId = claimed || 'anonymous'
  if (guestId === 'anonymous' || guestId.startsWith('guest_')) {
    return { userId: guestId, email: undefined, authenticated: false }
  }
  throw new RequestAuthError('Authentication required for this user', 401)
}

export function authErrorResponse(error: unknown) {
  if (error instanceof RequestAuthError) {
    return { status: error.status, body: { error: error.message } }
  }
  return null
}
