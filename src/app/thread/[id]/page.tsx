'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ConflictProsCons from '@/components/Thread/ConflictProsCons'
import { useLearnerId } from '@/hooks/useLearnerId'
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

function paperId(paper: ProcessedPaper) {
  return paper.id || paper._id || ''
}

export default function ThreadPage() {
  const params = useParams()
  const router = useRouter()
  const { userId, authHeaders } = useLearnerId()
  const threadId = decodeURIComponent(String(params.id || ''))
  const [experience, setExperience] = useState<Experience | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareNote, setShareNote] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [completedIds, setCompletedIds] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const cached = sessionStorage.getItem(`thread:${threadId}`)
        if (cached) {
          if (!cancelled) setExperience(JSON.parse(cached) as Experience)
          return
        }
        const response = await fetch(`/api/experiences?id=${encodeURIComponent(threadId)}`, {
          headers: authHeaders,
        })
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled && data.experience) {
          setExperience(data.experience as Experience)
          sessionStorage.setItem(`thread:${threadId}`, JSON.stringify(data.experience))
        }
      } catch {
        // Error state below gives a recovery path.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [threadId, authHeaders])

  useEffect(() => {
    try {
      setCompletedIds(JSON.parse(localStorage.getItem(`thread-progress:${threadId}`) || '[]'))
    } catch {
      setCompletedIds([])
    }
  }, [threadId])

  const sortedTimeline = useMemo(
    () => [...(experience?.papers || [])].sort((a, b) => (a.year || 0) - (b.year || 0)),
    [experience?.papers]
  )

  const openPaper = (paper: ProcessedPaper) => {
    const id = paperId(paper)
    if (!id) return
    try {
      sessionStorage.setItem(`paper:${id}`, JSON.stringify(paper))
      sessionStorage.setItem('combo:active-thread', threadId)
    } catch {
      // Continue without cache.
    }
    router.push(`/paper/${encodeURIComponent(id)}?thread=${encodeURIComponent(threadId)}`)
  }

  const runConflicts = async () => {
    if (!experience || experience.papers.length < 2) return
    setAnalyzing(true)
    try {
      const response = await fetch('/api/agent/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          query: experience.query,
          userId,
          papers: experience.papers.map((paper) => ({
            id: paperId(paper),
            title: paper.title,
            abstract: (paper as ProcessedPaper & { abstract?: string }).abstract,
            venue: paper.venue,
            year: paper.year,
            tldr: paper.tldr,
            relevanceReason: paper.relevanceReason,
          })),
        }),
      })
      if (!response.ok) throw new Error('Conflict analysis failed')
      const data = await response.json()
      const next = { ...experience, conflicts: data.analysis as ConflictAnalysis }
      setExperience(next)
      sessionStorage.setItem(`thread:${threadId}`, JSON.stringify(next))
      await fetch('/api/experiences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ id: threadId, userId, conflicts: data.analysis }),
      }).catch(() => {})
    } finally {
      setAnalyzing(false)
    }
  }

  const copyShareLink = async () => {
    const url = `${window.location.origin}/thread/${encodeURIComponent(threadId)}`
    try {
      await navigator.clipboard.writeText(url)
      setShareNote('Share link copied.')
    } catch {
      setShareNote(url)
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-6" aria-live="polite">
        <div className="text-center">
          <span className="ui-label" style={{ color: 'var(--teal)' }}>
            Restoring workspace
          </span>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Loading papers, choices, and learning context…
          </p>
        </div>
      </div>
    )
  }

  if (!experience) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-6">
        <div className="ui-panel max-w-lg p-7 text-center">
          <p className="ui-label mb-3">Research path unavailable</p>
          <h1 className="font-display text-2xl font-semibold">We could not restore this workspace.</h1>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            The original save may not have completed. Start a new path; your learner memory is
            separate and remains intact.
          </p>
          <button type="button" className="ui-button ui-button-primary mt-6" onClick={() => router.push('/')}>
            Start a new path
          </button>
        </div>
      </div>
    )
  }

  const firstUnread =
    experience.papers.find((paper) => !completedIds.includes(paperId(paper))) || experience.papers[0]
  const progress =
    experience.papers.length > 0
      ? Math.round((completedIds.length / experience.papers.length) * 100)
      : 0

  return (
    <div className="min-h-[calc(100vh-var(--app-header))]">
      <div className="mx-auto max-w-[1380px] px-4 py-8 md:px-7">
        <header className="mb-8 border-b pb-8" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <p className="ui-label mb-3" style={{ color: 'var(--teal)' }}>
                Research path · {experience.papers.length} sources
              </p>
              <h1 className="font-display text-3xl font-semibold tracking-[-0.025em] md:text-5xl">
                {experience.title.replace(/^Learning path:\s*/i, '')}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {experience.plan?.objective ||
                  `Build a working understanding of “${experience.query}” across evidence, methods, and tradeoffs.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="ui-button" onClick={() => void copyShareLink()}>
                Share path
              </button>
              {firstUnread && (
                <button type="button" className="ui-button ui-button-primary" onClick={() => openPaper(firstUnread)}>
                  {progress > 0 ? 'Continue learning' : 'Start with the first paper'} →
                </button>
              )}
            </div>
          </div>
          {shareNote && (
            <p className="mt-3 text-xs" style={{ color: 'var(--teal)' }} role="status">
              {shareNote}
            </p>
          )}
        </header>

        <div className="grid gap-7 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
          <aside className="space-y-4 xl:sticky xl:top-[calc(var(--app-header)+24px)] xl:self-start">
            <div className="ui-panel p-4">
              <div className="flex items-center justify-between">
                <p className="ui-label">Path progress</p>
                <span className="font-mono text-xs" style={{ color: 'var(--teal)' }}>
                  {progress}%
                </span>
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded-full" style={{ background: 'var(--surface-strong)' }}>
                <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'var(--teal)' }} />
              </div>
              <ol className="mt-5 space-y-1.5">
                {experience.papers.map((paper, index) => {
                  const id = paperId(paper)
                  const done = completedIds.includes(id)
                  const current = firstUnread && paperId(firstUnread) === id
                  return (
                    <li key={id || paper.title}>
                      <button
                        type="button"
                        onClick={() => openPaper(paper)}
                        className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.03]"
                      >
                        <span
                          className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border font-mono text-[9px]"
                          style={{
                            color: done ? '#07110e' : current ? 'var(--teal)' : 'var(--text-muted)',
                            borderColor: done || current ? 'var(--teal)' : 'var(--border)',
                            background: done ? 'var(--teal)' : 'transparent',
                          }}
                        >
                          {done ? '✓' : index + 1}
                        </span>
                        <span
                          className="line-clamp-2 text-xs leading-relaxed"
                          style={{ color: current ? 'var(--text)' : 'var(--text-secondary)' }}
                        >
                          {paper.title}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>

            {experience.library && (
              <div className="ui-panel p-4">
                <p className="ui-label" style={{ color: 'var(--teal)' }}>
                  Library access
                </p>
                <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Journal articles and books through your institution.
                </p>
                <div className="mt-3 space-y-2">
                  {experience.library.everythingSearchUrl && (
                    <a
                      href={experience.library.everythingSearchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-xs"
                      style={{ color: 'var(--teal)' }}
                    >
                      Search the UC collection →
                    </a>
                  )}
                  {experience.library.booksSearchUrl && (
                    <a
                      href={experience.library.booksSearchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-xs"
                      style={{ color: 'var(--teal)' }}
                    >
                      Find books and ebooks →
                    </a>
                  )}
                </div>
              </div>
            )}
          </aside>

          <main className="min-w-0 space-y-7">
            <section>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="ui-label">Decision surface</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold">Where the literature disagrees</h2>
                </div>
                {!experience.conflicts && experience.papers.length >= 2 && (
                  <button
                    type="button"
                    className="ui-button"
                    disabled={analyzing}
                    onClick={() => void runConflicts()}
                  >
                    {analyzing ? 'Comparing…' : 'Compare approaches'}
                  </button>
                )}
              </div>
              {experience.conflicts ? (
                <ConflictProsCons
                  analysis={experience.conflicts}
                  onChooseApproach={(id) => {
                    const paper = experience.papers.find((item) => paperId(item) === id)
                    if (paper) openPaper(paper)
                  }}
                />
              ) : (
                <div className="ui-panel p-6">
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Compare the selected papers to expose methodological tradeoffs, shared assumptions,
                    and when each approach is the better starting point.
                  </p>
                </div>
              )}
            </section>

            <section>
              <div className="mb-4">
                <p className="ui-label">Source set</p>
                <h2 className="mt-1 font-display text-2xl font-semibold">Papers in this path</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {experience.papers.map((paper, index) => (
                  <button
                    key={paperId(paper) || paper.title}
                    type="button"
                    className="ui-panel group min-h-[180px] p-5 text-left transition-colors hover:bg-[var(--surface-hover)]"
                    onClick={() => openPaper(paper)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px]" style={{ color: 'var(--teal)' }}>
                        PAPER {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="font-mono text-xs transition-transform group-hover:translate-x-1">→</span>
                    </div>
                    <h3 className="mt-5 font-display text-base font-semibold leading-snug">{paper.title}</h3>
                    <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {(paper.authors || []).slice(0, 2).join(', ')}
                      {paper.venue ? ` · ${paper.venue}` : ''}
                      {paper.year ? ` · ${paper.year}` : ''}
                    </p>
                    {paper.relevanceReason && (
                      <p className="mt-4 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--teal)' }}>
                        {paper.relevanceReason}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </section>
          </main>

          <aside className="space-y-4 xl:sticky xl:top-[calc(var(--app-header)+24px)] xl:self-start">
            <div className="ui-panel p-4">
              <p className="ui-label">Mentor plan</p>
              <ol className="mt-4 space-y-3">
                {(experience.plan?.steps || []).slice(0, 9).map((step, index) => (
                  <li key={step.id} className="flex gap-3">
                    <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="text-xs font-medium">{step.title}</p>
                      <p className="mt-1 text-[11px] capitalize" style={{ color: 'var(--text-muted)' }}>
                        {step.kind}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="ui-panel p-4">
              <p className="ui-label">What changed over time</p>
              <ol className="mt-4 space-y-4">
                {sortedTimeline.map((paper, index) => (
                  <li key={paperId(paper) || paper.title} className="relative pl-4">
                    <span
                      className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full"
                      style={{ background: index === sortedTimeline.length - 1 ? 'var(--teal)' : 'var(--border)' }}
                    />
                    <p className="font-mono text-[10px]" style={{ color: 'var(--teal)' }}>
                      {paper.year || 'n.d.'}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {paper.title}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
