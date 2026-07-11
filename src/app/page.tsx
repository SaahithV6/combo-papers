'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import SearchInput from '@/components/Search/SearchInput'
import PaperList from '@/components/Search/PaperList'
import LearnerMemoryPanel from '@/components/Learner/LearnerMemoryPanel'
import { useButterbaseAuth } from '@/components/ButterbaseProvider'
import { useLearnerId } from '@/hooks/useLearnerId'
import type { MentorTurn } from '@/lib/agent/types'
import type { PaperMetadata, ProcessedPaper } from '@/lib/types'

type SearchStatus = 'idle' | 'searching' | 'results' | 'processing'
type ProcessingState = Record<string, string>

const PROCESS_STAGES = [
  'Find and rank sources',
  'Build Living Pages',
  'Compare approaches',
  'Open research path',
]

function PlanKind({ kind }: { kind: string }) {
  const labels: Record<string, string> = {
    prerequisite: 'Ground',
    paper: 'Read',
    checkpoint: 'Reflect',
    lab: 'Explore',
    synthesis: 'Synthesize',
  }
  return <span className="ui-chip shrink-0">{labels[kind] || kind}</span>
}

export default function HomePage() {
  const router = useRouter()
  const { user, configured } = useButterbaseAuth()
  const {
    userId: learnerUserId,
    email: learnerEmail,
    ready: learnerReady,
    authHeaders,
  } = useLearnerId()
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [papers, setPapers] = useState<PaperMetadata[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [processingStatus, setProcessingStatus] = useState<ProcessingState>({})
  const [error, setError] = useState<string | null>(null)
  const [searchSource, setSearchSource] = useState('')
  const [mentor, setMentor] = useState<MentorTurn | null>(null)
  const [institutionalDomain, setInstitutionalDomain] = useState<string | null>(null)
  const [lastQuery, setLastQuery] = useState('')
  const [library, setLibrary] = useState<Record<string, unknown> | null>(null)

  const completeCount = useMemo(
    () => Object.values(processingStatus).filter((value) => value === 'complete').length,
    [processingStatus]
  )

  const handleSearch = async (query: string) => {
    setStatus('searching')
    setError(null)
    setPapers([])
    setSelectedIds([])
    setProcessingStatus({})
    setMentor(null)
    setLastQuery(query)
    setLibrary(null)

    try {
      const response = await fetch('/api/agent/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          query,
          userId: learnerReady ? learnerUserId : user?.id || 'anonymous',
          email: learnerEmail || (user?.email as string | undefined),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The research agent could not complete that search.')

      const nextPapers = (data.papers || []) as PaperMetadata[]
      setPapers(nextPapers)
      setSearchSource(data.source || 'hybrid discovery')
      setMentor(data.mentor || null)
      setInstitutionalDomain(data.institutional?.domain || null)
      setLibrary(data.library || null)
      setSelectedIds(
        nextPapers
          .slice(0, 5)
          .map((paper) => paper.id)
          .filter((id): id is string => Boolean(id))
      )
      setStatus('results')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Search failed. Try the guided demo.')
      setStatus('idle')
    }
  }

  const handlePaperToggle = (paper: PaperMetadata) => {
    if (!paper.id) return
    setSelectedIds((current) =>
      current.includes(paper.id!)
        ? current.filter((id) => id !== paper.id)
        : [...current, paper.id!]
    )
  }

  const handleProcessSelected = async () => {
    if (selectedIds.length === 0) return
    setStatus('processing')
    setError(null)

    const selected = papers.filter((paper) => paper.id && selectedIds.includes(paper.id))
    const query = lastQuery || mentor?.plan?.query || 'research topic'

    const processed = await Promise.all(
      selected.map(async (paper) => {
        setProcessingStatus((current) => ({ ...current, [paper.id!]: 'Building page' }))
        try {
          const response = await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ paper }),
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || 'Processing failed')

          const ready: ProcessedPaper = {
            ...data.paper,
            id: paper.id,
            relevanceReason: paper.relevanceReason || data.paper?.relevanceReason,
          }
          sessionStorage.setItem(`paper:${paper.id}`, JSON.stringify(ready))
          setProcessingStatus((current) => ({ ...current, [paper.id!]: 'complete' }))
          return ready
        } catch {
          setProcessingStatus((current) => ({ ...current, [paper.id!]: 'error' }))
          return null
        }
      })
    )

    const ready = processed.filter(Boolean) as ProcessedPaper[]
    if (ready.length === 0) {
      setError('None of the selected papers could be prepared. Try the guided demo instead.')
      setStatus('results')
      return
    }

    if (ready.length === 1) {
      router.push(`/paper/${encodeURIComponent(ready[0].id!)}`)
      return
    }

    let conflicts = null
    try {
      const response = await fetch('/api/agent/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          query,
          userId: learnerReady ? learnerUserId : user?.id || 'anonymous',
          papers: ready.map((paper) => ({
            id: paper.id,
            title: paper.title,
            venue: paper.venue,
            year: paper.year,
            tldr: paper.tldr,
            relevanceReason: paper.relevanceReason,
          })),
        }),
      })
      if (response.ok) conflicts = (await response.json()).analysis
    } catch {
      // Conflict analysis is additive; a path still works without it.
    }

    const saveResponse = await fetch('/api/experiences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        query,
        title: mentor?.plan?.title || `Research path: ${query}`,
        papers: ready,
        conflicts,
        plan: mentor?.plan || null,
        library,
        userId: learnerReady ? learnerUserId : user?.id || 'anonymous',
      }),
    })

    const save = saveResponse.ok ? await saveResponse.json() : { id: `local_${Date.now()}` }
    const experience = {
      id: save.id,
      query,
      title: mentor?.plan?.title || `Research path: ${query}`,
      papers: ready,
      conflicts,
      plan: mentor?.plan || null,
      library,
    }
    sessionStorage.setItem(`thread:${save.id}`, JSON.stringify(experience))
    router.push(`/thread/${encodeURIComponent(save.id)}`)
  }

  const isWorking = status === 'searching' || status === 'processing'

  return (
    <div className="min-h-[calc(100vh-var(--app-header))]">
      <div className="mx-auto max-w-[1240px] px-4 py-10 md:px-8 md:py-16">
        {status === 'idle' && (
          <>
            <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
              <div>
                <div className="mb-6 flex flex-wrap items-center gap-2">
                  <span className="ui-chip" style={{ color: 'var(--teal)' }}>
                    Research workspace
                  </span>
                  <span className="ui-chip">Plan · compare · learn · remember</span>
                </div>
                <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.06] tracking-[-0.04em] md:text-6xl">
                  Turn a field of papers into{' '}
                  <span style={{ color: 'var(--teal)' }}>working intuition.</span>
                </h1>
                <p
                  className="mt-6 max-w-2xl text-lg leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Gather the literature, see where approaches disagree, and learn through interactive
                  explanations and runnable visual models—without flattening the research into chat.
                </p>
                <div className="mt-8 grid max-w-2xl grid-cols-3 gap-2">
                  {[
                    ['01', 'Orient', 'A path, not a list'],
                    ['02', 'Compare', 'Tradeoffs with evidence'],
                    ['03', 'Understand', 'Living Pages and labs'],
                  ].map(([number, title, body]) => (
                    <div key={title} className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--teal)' }}>
                        {number}
                      </p>
                      <p className="mt-1 font-display text-xs font-semibold md:text-sm">{title}</p>
                      <p className="mt-1 hidden text-xs sm:block" style={{ color: 'var(--text-muted)' }}>
                        {body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ui-panel p-4 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="ui-label">Start a research path</p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      A topic, question, or decision you need to understand.
                    </p>
                  </div>
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: configured ? 'var(--teal)' : 'var(--amber)' }}
                    title={configured ? 'Persistence connected' : 'Local demo mode'}
                  />
                </div>
                <SearchInput onSearch={handleSearch} isLoading={false} />
                <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => void handleSearch('mechanistic interpretability in large language models')}
                    className="group flex w-full items-center justify-between gap-4 rounded-lg p-2 text-left transition-colors hover:bg-white/[0.025]"
                  >
                    <span>
                      <span className="ui-label" style={{ color: 'var(--amber)' }}>
                        Guided demo
                      </span>
                      <span className="mt-1 block text-sm">Mechanistic interpretability</span>
                    </span>
                    <span className="font-mono text-sm transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </button>
                </div>
              </div>
            </section>

            <section className="mt-12 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
              <LearnerMemoryPanel />
              <div className="ui-panel p-5">
                <p className="ui-label">What survives the session</p>
                <div className="mt-4 space-y-4">
                  {[
                    ['Your friction', 'Concepts you struggled with shape the next path.'],
                    ['Your choices', 'The approaches you select become research context.'],
                    ['Your work', 'Threads, notes, and labs remain usable and shareable.'],
                  ].map(([title, body]) => (
                    <div key={title} className="flex gap-3">
                      <span
                        className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: 'var(--teal)' }}
                      />
                      <div>
                        <p className="font-display text-xs font-semibold">{title}</p>
                        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {isWorking && (
          <section className="mx-auto max-w-3xl py-16" aria-live="polite">
            <p className="ui-label mb-3" style={{ color: 'var(--teal)' }}>
              {status === 'searching' ? 'Orienting' : 'Preparing your workspace'}
            </p>
            <h1 className="font-display text-3xl font-semibold md:text-4xl">
              {status === 'searching'
                ? `Mapping “${lastQuery}”`
                : `Turning ${selectedIds.length} papers into a learning path`}
            </h1>
            <div className="mt-10 space-y-2">
              {PROCESS_STAGES.map((stage, index) => {
                const activeIndex =
                  status === 'searching'
                    ? 0
                    : completeCount < selectedIds.length
                      ? 1
                      : 2
                const done = index < activeIndex
                const active = index === activeIndex
                return (
                  <div
                    key={stage}
                    className="flex items-center gap-4 rounded-xl border px-4 py-3"
                    style={{
                      borderColor: active ? 'rgba(79, 209, 181, 0.3)' : 'var(--border-subtle)',
                      background: active ? 'var(--teal-soft)' : 'transparent',
                      color: done || active ? 'var(--text)' : 'var(--text-muted)',
                    }}
                  >
                    <span
                      className={active ? 'animate-pulse' : ''}
                      style={{ color: done || active ? 'var(--teal)' : 'var(--text-muted)' }}
                    >
                      {done ? '✓' : String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="font-display text-sm">{stage}</span>
                    {active && <span className="ml-auto ui-label">In progress</span>}
                  </div>
                )
              })}
            </div>
            {status === 'processing' && completeCount > 0 && (
              <button
                type="button"
                className="ui-button mt-6"
                onClick={() => {
                  const first = selectedIds.find((id) => processingStatus[id] === 'complete')
                  if (first) router.push(`/paper/${encodeURIComponent(first)}`)
                }}
              >
                Read the first ready page while we finish →
              </button>
            )}
          </section>
        )}

        {status === 'results' && (
          <section>
            <button
              type="button"
              className="ui-button ui-button-ghost mb-6"
              onClick={() => {
                setStatus('idle')
                setPapers([])
                setMentor(null)
              }}
            >
              ← Refine question
            </button>

            <div className="grid gap-7 lg:grid-cols-[340px_minmax(0,1fr)]">
              <aside className="space-y-4 lg:sticky lg:top-[calc(var(--app-header)+24px)] lg:self-start">
                <div className="ui-panel p-5">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <p className="ui-label" style={{ color: 'var(--teal)' }}>
                      Your learning path
                    </p>
                    {institutionalDomain && <span className="ui-chip">{institutionalDomain}</span>}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {mentor?.message || 'Choose the sources that belong in this path.'}
                  </p>
                  {mentor?.plan?.steps && (
                    <ol className="mt-5 space-y-2">
                      {mentor.plan.steps.slice(0, 8).map((step) => (
                        <li key={step.id} className="flex items-start gap-2.5">
                          <PlanKind kind={step.kind} />
                          <span className="pt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            {step.title}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                <LearnerMemoryPanel />
              </aside>

              <div>
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="ui-label">Source set</p>
                    <h2 className="mt-1 font-display text-2xl font-semibold">
                      {papers.length} relevant papers
                    </h2>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {selectedIds.length} selected · {searchSource}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ui-button ui-button-primary"
                    disabled={selectedIds.length === 0}
                    onClick={() => void handleProcessSelected()}
                  >
                    Build path with {selectedIds.length} paper{selectedIds.length === 1 ? '' : 's'} →
                  </button>
                </div>

                {papers.length > 0 ? (
                  <PaperList
                    papers={papers}
                    onSelectPaper={handlePaperToggle}
                    selectedIds={selectedIds}
                    processingStatus={processingStatus}
                  />
                ) : (
                  <div className="ui-panel p-8 text-center">
                    <p className="font-display text-lg font-semibold">No useful source set yet.</p>
                    <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Broaden the question, remove a date constraint, or use the guided demo.
                    </p>
                    <button
                      type="button"
                      className="ui-button mt-5"
                      onClick={() => void handleSearch('mechanistic interpretability in large language models')}
                    >
                      Open guided demo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {error && (
          <div
            className="fixed bottom-5 left-1/2 z-[100] flex max-w-[min(560px,calc(100vw-32px))] -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl"
            style={{
              color: 'var(--text)',
              borderColor: 'rgba(239, 127, 127, 0.35)',
              background: 'var(--surface)',
            }}
            role="alert"
          >
            <span style={{ color: 'var(--danger)' }}>!</span>
            <p className="text-sm">{error}</p>
            <button type="button" className="ui-button ui-button-ghost ml-auto" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
