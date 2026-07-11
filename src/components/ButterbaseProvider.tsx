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
  signInWithGoogle: () => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const ButterbaseContext = createContext<ButterbaseContextValue>({
  client: null,
  configured: false,
  user: null,
  loading: false,
  signIn: async () => ({ error: 'Butterbase not configured' }),
  signUp: async () => ({ error: 'Butterbase not configured' }),
  signInWithGoogle: async () => ({ error: 'Butterbase not configured' }),
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

function oauthCallbackUrl() {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/auth/callback`
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
        // Finish OAuth if we landed with tokens (also handled on /auth/callback)
        if (typeof window !== 'undefined') {
          const q = window.location.search
          if (q.includes('access_token') || q.includes('code=')) {
            const { data, error } = await client.auth.handleOAuthCallback()
            if (!error && data?.user) {
              setUser(asAuthUser(data.user))
            }
          }
        }

        const session = client.sessionManager.getSession()
        const sessionUser = asAuthUser(session && 'user' in session ? session.user : null)
        if (sessionUser) setUser(sessionUser)

        const { data } = await client.auth.getUser()
        const next = asAuthUser(data)
        if (next) {
          setUser(next)
          void fetch('/api/learner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: next.id, email: next.email }),
          }).catch(() => {})
        }
      } catch {
        // Demo mode / no session
      } finally {
        setLoading(false)
      }

      const { unsubscribe } = client.onAuthStateChange((_event, session) => {
        const next = asAuthUser(
          session && typeof session === 'object' && 'user' in session ? session.user : null
        )
        setUser(next)
        if (next?.id) {
          void fetch('/api/learner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: next.id, email: next.email }),
          }).catch(() => {})
        }
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
    signInWithGoogle: async () => {
      if (!client) return { error: 'Butterbase not configured' }
      try {
        const { url } = client.auth.signInWithOAuth({
          provider: 'google',
          redirectTo: oauthCallbackUrl(),
        })
        if (!url) return { error: 'Google OAuth URL missing — configure provider in Butterbase' }
        window.location.href = url
        return {}
      } catch (e) {
        return {
          error:
            e instanceof Error
              ? e.message
              : 'Google OAuth failed — add Google client ID/secret in Butterbase',
        }
      }
    },
    signOut: async () => {
      if (!client) return
      await client.auth.signOut()
      setUser(null)
    },
  }

  return <ButterbaseContext.Provider value={value}>{children}</ButterbaseContext.Provider>
}
