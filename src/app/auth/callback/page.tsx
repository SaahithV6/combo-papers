'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getButterbase, isButterbaseConfigured } from '@/lib/butterbase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState('Completing Google sign-in…')

  useEffect(() => {
    const run = async () => {
      if (!isButterbaseConfigured()) {
        setMessage('Butterbase is not configured.')
        return
      }
      const client = getButterbase()
      if (!client) {
        setMessage('Butterbase client unavailable.')
        return
      }
      try {
        const { data, error } = await client.auth.handleOAuthCallback()
        if (error) {
          setMessage(String(error))
          return
        }
        const email = data?.user && 'email' in data.user ? String(data.user.email || '') : ''
        setMessage(email ? `Signed in as ${email}` : 'Signed in')
        setTimeout(() => router.replace('/'), 600)
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'OAuth callback failed')
      }
    }
    void run()
  }, [router])

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: '#0a0e14' }}
    >
      <p className="text-sm" style={{ color: '#e8e0d0' }}>
        {message}
      </p>
    </div>
  )
}
