'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useButterbaseAuth } from '@/components/ButterbaseProvider'

export default function SignInPage() {
  const { signIn, signInWithGoogle, configured } = useButterbaseAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await signIn(email, password)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.push('/')
  }

  const onGoogle = async () => {
    setError(null)
    const result = await signInWithGoogle()
    if (result.error) setError(result.error)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#0a0e14' }}>
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md p-8 rounded-xl space-y-4"
        style={{ backgroundColor: '#111827', border: '1px solid #1a2235' }}
      >
        <h1 className="text-2xl font-bold" style={{ color: '#e8e0d0', fontFamily: 'Syne, sans-serif' }}>
          Sign in
        </h1>
        <p className="text-sm" style={{ color: '#9ca3af' }}>
          Prefer Google for a seamless handoff to Colab. Use your UCSC Google account when possible
          for institutional library context.
        </p>
        {!configured && (
          <p className="text-sm" style={{ color: '#f5a623' }}>
            Butterbase is not configured yet. Demo mode still works from the home page.
          </p>
        )}

        <button
          type="button"
          onClick={() => void onGoogle()}
          disabled={!configured}
          className="w-full py-2.5 rounded-lg font-medium text-sm"
          style={{ backgroundColor: '#e8e0d0', color: '#0a0e14' }}
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-3 text-xs" style={{ color: '#6b7280' }}>
          <span className="flex-1 h-px" style={{ backgroundColor: '#1a2235' }} />
          or email
          <span className="flex-1 h-px" style={{ backgroundColor: '#1a2235' }} />
        </div>

        <input
          type="email"
          required
          placeholder="you@ucsc.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-transparent"
          style={{ border: '1px solid #1a2235', color: '#e8e0d0' }}
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-transparent"
          style={{ border: '1px solid #1a2235', color: '#e8e0d0' }}
        />
        {error && <p className="text-sm" style={{ color: '#f5a623' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading || !configured}
          className="w-full py-2.5 rounded-lg font-medium"
          style={{ backgroundColor: '#00d4aa', color: '#0a0e14' }}
        >
          {loading ? 'Signing in…' : 'Sign in with email'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/sign-up')}
          className="w-full text-sm"
          style={{ color: '#00d4aa' }}
        >
          Create an account
        </button>
      </form>
    </div>
  )
}
