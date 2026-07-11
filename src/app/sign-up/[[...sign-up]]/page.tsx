'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useButterbaseAuth } from '@/components/ButterbaseProvider'

export default function SignUpPage() {
  const { signUp, configured } = useButterbaseAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await signUp(email, password)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#0a0e14' }}>
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md p-8 rounded-xl space-y-4"
        style={{ backgroundColor: '#111827', border: '1px solid #1a2235' }}
      >
        <h1 className="text-2xl font-bold" style={{ color: '#e8e0d0', fontFamily: 'Syne, sans-serif' }}>
          Create account
        </h1>
        <p className="text-sm" style={{ color: '#9ca3af' }}>
          Sign up with your institutional email so the agent can prefer peer-reviewed journal versions.
        </p>
        {!configured && (
          <p className="text-sm" style={{ color: '#f5a623' }}>
            Butterbase is not configured yet. Set NEXT_PUBLIC_BUTTERBASE_APP_ID after account setup.
          </p>
        )}
        <input
          type="email"
          required
          placeholder="you@university.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-transparent"
          style={{ border: '1px solid #1a2235', color: '#e8e0d0' }}
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (8+ chars)"
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
          {loading ? 'Creating…' : 'Create account'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/sign-in')}
          className="w-full text-sm"
          style={{ color: '#00d4aa' }}
        >
          Already have an account?
        </button>
      </form>
    </div>
  )
}
