'use client'

import { useEffect, useState } from 'react'
import { useButterbaseAuth } from '@/components/ButterbaseProvider'
import { resolveClientUserId } from '@/lib/learnerIdentity'

/**
 * Stable user id for API calls: Butterbase auth id, or a guest_* local id.
 */
export function useLearnerId() {
  const { user, loading: authLoading } = useButterbaseAuth()
  const [userId, setUserId] = useState<string>('anonymous')
  const [ready, setReady] = useState(false)

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
  }
}
