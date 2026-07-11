'use client'

import { useEffect, useMemo, useState } from 'react'
import { useButterbaseAuth } from '@/components/ButterbaseProvider'
import { resolveClientUserId } from '@/lib/learnerIdentity'

/**
 * Stable user id for API calls: Butterbase auth id, or a guest_* local id.
 */
export function useLearnerId() {
  const { user, client, loading: authLoading } = useButterbaseAuth()
  const [userId, setUserId] = useState<string>('anonymous')
  const [ready, setReady] = useState(false)
  const accessToken = client?.getAccessToken()
  const authHeaders = useMemo<Record<string, string>>(
    () => {
      if (!accessToken) return {} as Record<string, string>
      return { Authorization: `Bearer ${accessToken}` } as Record<string, string>
    },
    [accessToken]
  )

  useEffect(() => {
    if (authLoading) return
    setUserId(resolveClientUserId(user?.id))
    setReady(true)
  }, [user?.id, authLoading])

  return {
    userId,
    email: user?.email as string | undefined,
    isGuest: !user?.id,
    ready,
    authLoading,
    authHeaders,
  }
}
