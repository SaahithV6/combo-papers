'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useLearnerId } from '@/hooks/useLearnerId'
import type { LearnerProfile } from '@/lib/agent/types'

type ThreadSummary = {
  id: string
  title: string
  query: string
  status: string
  created_at?: string
}

export default function LearnerMemoryPanel() {
  const { userId, email, isGuest, ready, authHeaders } = useLearnerId()
  const [profile, setProfile] = useState<LearnerProfile | null>(null)
  const [memories, setMemories] = useState<string[]>([])
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [goalsDraft, setGoalsDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  const refresh = useCallback(async () => {
    if (!ready || !userId) return
    try {
      await fetch('/api/learner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ userId, email }),
      })
      const res = await fetch(
        `/api/learner?userId=${encodeURIComponent(userId)}&query=${encodeURIComponent('recent learning')}`,
        { headers: authHeaders }
      )
      if (!res.ok) return
      const data = await res.json()
      setProfile(data.profile || null)
      setMemories(Array.isArray(data.memories) ? data.memories : [])
      setThreads(Array.isArray(data.threads) ? data.threads : [])
      if (data.profile?.goals?.length) {
        setGoalsDraft(data.profile.goals.join(', '))
      }
    } catch {
      /* ignore */
    }
  }, [ready, userId, email, authHeaders])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveGoals = async () => {
    setSaving(true)
    try {
      const goals = goalsDraft
        .split(/[,;]/)
        .map((g) => g.trim())
        .filter(Boolean)
      const res = await fetch('/api/learner', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ userId, goals, email }),
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile || null)
      }
    } finally {
      setSaving(false)
    }
  }

  if (!ready) return null

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ui-panel flex w-full items-center justify-between px-4 py-4 text-left text-sm"
        style={{
          color: 'var(--text)',
        }}
      >
        <span>
          <span className="font-display font-semibold" style={{ color: 'var(--teal)' }}>
            Memory
          </span>
          {isGuest ? ' · guest session' : ` · ${email || 'signed in'}`}
          {(profile?.gapConcepts?.length || 0) > 0 && (
            <span className="ml-2 text-xs" style={{ color: '#f5a623' }}>
              {profile!.gapConcepts.length} gap
              {profile!.gapConcepts.length === 1 ? '' : 's'}
            </span>
          )}
        </span>
        <span className="text-xs" style={{ color: '#9ca3af' }}>
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {open && (
        <div
          className="ui-panel mt-2 space-y-4 px-4 py-4 text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Your goals, friction, and prior paths shape what the mentor surfaces next.
            {isGuest && ' Sign in to keep memory across devices.'}
          </p>

          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: '#9ca3af' }}>
              Goals
            </label>
            <div className="flex gap-2 mt-1">
              <input
                value={goalsDraft}
                onChange={(e) => setGoalsDraft(e.target.value)}
                placeholder="e.g. transformers, RLHF, institutional lit review"
                className="ui-input flex-1 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void saveGoals()}
                disabled={saving}
                className="ui-button"
              >
                {saving ? '…' : 'Save'}
              </button>
            </div>
          </div>

          {(profile?.gapConcepts?.length || 0) > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#f5a623' }}>
                Friction concepts
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile!.gapConcepts.map((g) => (
                  <span
                    key={g}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ backgroundColor: '#f5a62322', color: '#f5a623' }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(profile?.knownConcepts?.length || 0) > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#00d4aa' }}>
                Known concepts
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile!.knownConcepts.map((g) => (
                  <span
                    key={g}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ backgroundColor: '#00d4aa22', color: '#00d4aa' }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {memories.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>
                EverOS recall
              </p>
              <ul className="space-y-1.5">
                {memories.slice(0, 4).map((m, i) => (
                  <li key={i} className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>
                    · {m.length > 180 ? `${m.slice(0, 180)}…` : m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {threads.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>
                Your threads
              </p>
              <ul className="space-y-1">
                {threads.slice(0, 5).map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/thread/${encodeURIComponent(t.id)}`}
                      className="text-xs underline"
                      style={{ color: '#00d4aa' }}
                    >
                      {t.title || t.query}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
