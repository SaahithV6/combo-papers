'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ConflictProsCons from '@/components/Thread/ConflictProsCons'
import type { ConflictAnalysis } from '@/lib/agent/conflicts'
import type { MentorTurn } from '@/lib/agent/types'
import type { ProcessedPaper } from '@/lib/types'

interface Experience {
  id: string
  query: string
  title: string
  papers: ProcessedPaper[]
  conflicts?: ConflictAnalysis | null
  plan?: MentorTurn['plan'] | null
  library?: {
    articlesSearchUrl?: string
    booksSearchUrl?: string
    everythingSearchUrl?: string
    note?: string
  } | null
}

export default function ThreadPage() {
  const params = useParams()
  const router = useRouter()
  const threadId = decodeURIComponent(String(params.id || ''))
  const [experience, setExperience] = useState<Experience | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareNote, setShareNote] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const local = sessionStorage.getItem(`thread:${threadId}`)
        if (local) {
          if (!cancelled) setExperience(JSON.parse(local) as Experience)
          setLoading(false)
          return
        }

        const res = await fetch(`/api/experiences?id=${encodeURIComponent(threadId)}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data.experience) {
            setExperience(data.experience as Experience)
            sessionStorage.setItem(`thread:${threadId}`, JSON.stringify(data.experience))
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [threadId])

  const runConflicts = async () => {
    if (!experience || experience.papers.length < 2) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/agent/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: experience.query,
          papers: experience.papers.map((p) => ({
            id: p.id || p._id,
            title: p.title,
            abstract: (p as ProcessedPaper & { abstract?: string }).abstract,
            venue: p.venue,
            year: p.year,
            tldr: p.tldr,
            relevanceReason: p.relevanceReason,
          })),
        }),
      })
      if (!res.ok) throw new Error('Conflict analysis failed')
      const data = await res.json()
      const next = { ...experience, conflicts: data.analysis as ConflictAnalysis }
      setExperience(next)
      sessionStorage.setItem(`thread:${threadId}`, JSON.stringify(next))
      void fetch('/api/experiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...next,
          title: next.title,
        }),
      })
    } catch (e) {
      console.error(e)
    } finally {
      setAnalyzing(false)
    }
  }

  const copyShareLink = async () => {
    const url = `${window.location.origin}/thread/${encodeURIComponent(threadId)}`
    try {
      await navigator.clipboard.writeText(url)
      setShareNote('Link copied — anyone with Butterbase-backed save can open this experience.')
    } catch {
      setShareNote(url)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0e14' }}>
        <p style={{ color: '#9ca3af' }}>Loading research experience…</p>
      </div>
    )
  }

  if (!experience) {
    return (
      <div className="min-h-screen px-6 py-12" style={{ backgroundColor: '#0a0e14' }}>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl mb-3" style={{ color: '#e8e0d0', fontFamily: 'Syne, sans-serif' }}>
            Experience not found
          </h1>
          <p className="text-sm mb-4" style={{ color: '#9ca3af' }}>
            This thread may only exist in the original browser session. Start a multi-paper path from
            home to create a shareable experience.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 rounded text-sm"
            style={{ backgroundColor: '#00d4aa', color: '#0a0e14' }}
          >
            New search →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#0a0e14', backgroundImage: "url('/grid-texture.svg')" }}
    >
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <button
              onClick={() => router.push('/')}
              className="text-sm mb-4"
              style={{ color: '#9ca3af' }}
            >
              ← Back
            </button>
            <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#00d4aa' }}>
              Research experience · multi-paper
            </p>
            <h1
              className="text-3xl font-bold mb-2"
              style={{ color: '#e8e0d0', fontFamily: 'Syne, sans-serif' }}
            >
              {experience.title}
            </h1>
            <p style={{ color: '#9ca3af', fontFamily: 'IBM Plex Serif, serif' }}>
              Query: {experience.query}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void copyShareLink()}
              className="px-3 py-2 rounded text-sm"
              style={{ border: '1px solid #1a2235', color: '#e8e0d0' }}
            >
              Share
            </button>
            {!experience.conflicts && experience.papers.length >= 2 && (
              <button
                onClick={() => void runConflicts()}
                disabled={analyzing}
                className="px-3 py-2 rounded text-sm"
                style={{ backgroundColor: '#f5a623', color: '#0a0e14' }}
              >
                {analyzing ? 'Comparing…' : 'Find conflicts'}
              </button>
            )}
          </div>
        </div>

        {shareNote && (
          <p className="text-xs" style={{ color: '#00d4aa' }}>
            {shareNote}
          </p>
        )}

        {experience.library && (
          <div
            className="p-4 rounded-xl text-sm space-y-2"
            style={{ backgroundColor: '#111827', border: '1px solid #00d4aa33' }}
          >
            <p className="text-xs uppercase" style={{ color: '#00d4aa' }}>
              UCSC Library · OpenAthens
            </p>
            <p className="text-xs" style={{ color: '#9ca3af' }}>
              {experience.library.note}
            </p>
            <div className="flex flex-wrap gap-3 text-xs">
              {experience.library.everythingSearchUrl && (
                <a href={experience.library.everythingSearchUrl} target="_blank" rel="noreferrer" style={{ color: '#00d4aa' }}>
                  Articles + books in UC Library Search →
                </a>
              )}
              {experience.library.booksSearchUrl && (
                <a href={experience.library.booksSearchUrl} target="_blank" rel="noreferrer" style={{ color: '#00d4aa' }}>
                  Books / ebooks →
                </a>
              )}
            </div>
          </div>
        )}

        {experience.conflicts && (
          <ConflictProsCons
            analysis={experience.conflicts}
            onChooseApproach={(paperId) => {
              if (paperId) router.push(`/paper/${encodeURIComponent(paperId)}`)
            }}
          />
        )}

        <section>
          <h2 className="text-lg mb-3" style={{ color: '#e8e0d0', fontFamily: 'Syne, sans-serif' }}>
            Papers in this path ({experience.papers.length})
          </h2>
          <div className="space-y-3">
            {experience.papers.map((paper) => {
              const id = paper.id || paper._id || ''
              return (
                <button
                  key={id || paper.title}
                  type="button"
                  onClick={() => {
                    if (id) {
                      try {
                        sessionStorage.setItem(`paper:${id}`, JSON.stringify(paper))
                      } catch {
                        /* ignore */
                      }
                      router.push(`/paper/${encodeURIComponent(id)}`)
                    }
                  }}
                  className="w-full text-left p-4 rounded-xl"
                  style={{ backgroundColor: '#111827', border: '1px solid #1a2235' }}
                >
                  <p className="text-sm font-medium" style={{ color: '#e8e0d0' }}>
                    {paper.title}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                    {(paper.authors || []).slice(0, 3).join(', ')}
                    {paper.venue ? ` · ${paper.venue}` : ''}
                    {paper.year ? ` · ${paper.year}` : ''}
                  </p>
                  {paper.relevanceReason && (
                    <p className="text-xs mt-2" style={{ color: '#00d4aa' }}>
                      {paper.relevanceReason}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {experience.plan?.steps && (
          <section>
            <h2 className="text-lg mb-3" style={{ color: '#e8e0d0', fontFamily: 'Syne, sans-serif' }}>
              Mentor plan
            </h2>
            <ol className="space-y-2 text-sm" style={{ color: '#9ca3af' }}>
              {experience.plan.steps.map((step, i) => (
                <li key={step.id}>
                  {i + 1}. [{step.kind}] {step.title}
                </li>
              ))}
            </ol>
          </section>
        )}

        <section>
          <h2 className="text-lg mb-3" style={{ color: '#e8e0d0', fontFamily: 'Syne, sans-serif' }}>
            Timeline · what changed
          </h2>
          <div className="space-y-3">
            {[...experience.papers]
              .sort((a, b) => (a.year || 0) - (b.year || 0))
              .map((paper, i, arr) => {
                const prev = i > 0 ? arr[i - 1] : null
                return (
                  <div
                    key={paper.id || paper.title}
                    className="p-4 rounded-xl"
                    style={{ backgroundColor: '#111827', border: '1px solid #1a2235' }}
                  >
                    <p className="text-xs mb-1" style={{ color: '#00d4aa' }}>
                      {paper.year || 'n.d.'} · {paper.venue || 'venue unknown'}
                    </p>
                    <p className="text-sm" style={{ color: '#e8e0d0' }}>
                      {paper.title}
                    </p>
                    {prev && (
                      <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>
                        After “{prev.title.slice(0, 48)}…” — compare claims in the conflict panel, or open both
                        Living Pages and watch amber “seen before” underlines on shared notation.
                      </p>
                    )}
                  </div>
                )
              })}
          </div>
        </section>
      </div>
    </div>
  )
}
