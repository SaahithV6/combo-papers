'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getButterbase, isButterbaseConfigured, type ButterbaseClient } from '@/lib/butterbase'

type AuthUser = {
  id: string
  email?: string
  [key: string]: unknown
}

type ButterbaseContextValue = {
  client: ButterbaseClient | null
  configured: boolean
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const ButterbaseContext = createContext<ButterbaseContextValue>({
  client: null,
  configured: false,
  user: null,
  loading: false,
  signIn: async () => ({ error: 'Butterbase not configured' }),
  signUp: async () => ({ error: 'Butterbase not configured' }),
  signOut: async () => {},
})

export function useButterbaseAuth() {
  return useContext(ButterbaseContext)
}

function asAuthUser(value: unknown): AuthUser | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (typeof record.id !== 'string') return null
  return {
    ...record,
    id: record.id,
    email: typeof record.email === 'string' ? record.email : undefined,
  }
}

export default function ButterbaseProvider({ children }: { children: ReactNode }) {
  const configured = isButterbaseConfigured()
  const client = useMemo(() => (configured ? getButterbase() : null), [configured])
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(configured)

  useEffect(() => {
    if (!client) {
      setLoading(false)
      return
    }

    let unsub: (() => void) | undefined

    const boot = async () => {
      try {
        const session = client.sessionManager.getSession()
        const sessionUser = asAuthUser(session && 'user' in session ? session.user : null)
        if (sessionUser) setUser(sessionUser)

        const { data } = await client.auth.getUser()
        const next = asAuthUser(data)
        if (next) setUser(next)
      } catch {
        // Demo mode / no session
      } finally {
        setLoading(false)
      }

      const { unsubscribe } = client.onAuthStateChange((_event, session) => {
        const next = asAuthUser(session && typeof session === 'object' && 'user' in session ? session.user : null)
        setUser(next)
      })
      unsub = unsubscribe
    }

    void boot()
    return () => unsub?.()
  }, [client])

  const value: ButterbaseContextValue = {
    client,
    configured,
    user,
    loading,
    signIn: async (email, password) => {
      if (!client) return { error: 'Butterbase not configured' }
      const { error } = await client.auth.signIn({ email, password })
      return { error: error ? String(error) : undefined }
    },
    signUp: async (email, password) => {
      if (!client) return { error: 'Butterbase not configured' }
      const { error } = await client.auth.signUp({ email, password })
      return { error: error ? String(error) : undefined }
    },
    signOut: async () => {
      if (!client) return
      await client.auth.signOut()
      setUser(null)
    },
  }

  return <ButterbaseContext.Provider value={value}>{children}</ButterbaseContext.Provider>
}
