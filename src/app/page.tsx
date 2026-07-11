'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SearchInput from '@/components/Search/SearchInput'
import PaperList from '@/components/Search/PaperList'
import { PaperMetadata, ProcessedPaper } from '@/lib/types'
import { useButterbaseAuth } from '@/components/ButterbaseProvider'
import type { MentorTurn } from '@/lib/agent/types'

type SearchStatus = 'idle' | 'searching' | 'results' | 'processing'

interface ProcessingState {
  [paperId: string]: string
}

export default function HomePage() {
  const router = useRouter()
  const { user, configured, signOut } = useButterbaseAuth()
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [papers, setPapers] = useState<PaperMetadata[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [processingStatus, setProcessingStatus] = useState<ProcessingState>({})
  const [error, setError] = useState<string | null>(null)
  const [searchSource, setSearchSource] = useState<string>('')
  const [mentor, setMentor] = useState<MentorTurn | null>(null)
  const [institutionalDomain, setInstitutionalDomain] = useState<string | null>(null)

  const handleSearch = async (query: string) => {
    setStatus('searching')
    setError(null)
    setPapers([])
    setSelectedIds([])
    setProcessingStatus({})
    setMentor(null)

    try {
      const response = await fetch('/api/agent/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          userId: user?.id || 'anonymous',
          email: user?.email || undefined,
        }),
      })

      if (!response.ok) throw new Error('Agent search failed')

      const data = await response.json()
      setPapers(data.papers || [])
      setSearchSource(data.source || 'hybrid')
      setMentor(data.mentor || null)
      setInstitutionalDomain(data.institutional?.domain || null)
      setStatus('results')
      setSelectedIds((data.papers || []).slice(0, 5).map((p: PaperMetadata) => p.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
      setStatus('idle')
    }
  }

  const handlePaperToggle = (paper: PaperMetadata) => {
    if (!paper.id) return
    setSelectedIds((prev) =>
      prev.includes(paper.id!)
        ? prev.filter((id) => id !== paper.id)
        : [...prev, paper.id!]
    )
  }

  const handleOpenDemo = () => {
    router.push(`/paper/${encodeURIComponent('arxiv:2209.11895')}`)
  }

  const handleProcessSelected = async () => {
    if (selectedIds.length === 0) return
    setStatus('processing')

    const selected = papers.filter((p) => p.id && selectedIds.includes(p.id))

    const processPromises = selected.map(async (paper) => {
      setProcessingStatus((prev) => ({ ...prev, [paper.id!]: 'processing...' }))

      try {
        const response = await fetch('/api/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paper }),
        })

        if (!response.ok) throw new Error('Processing failed')

        const data = await response.json()
        const processedPaper: ProcessedPaper = { ...data.paper, id: paper.id }

        try {
          sessionStorage.setItem(`paper:${paper.id}`, JSON.stringify(processedPaper))
        } catch {
          // Storage might be full
        }

        setProcessingStatus((prev) => ({ ...prev, [paper.id!]: 'complete' }))
        return processedPaper
      } catch {
        setProcessingStatus((prev) => ({ ...prev, [paper.id!]: 'error' }))
        return null
      }
    })

    await Promise.allSettled(processPromises)
    const firstReady = selected[0]
    if (firstReady) {
      router.push(`/paper/${encodeURIComponent(firstReady.id!)}`)
    }
  }

  const anyComplete = selectedIds.some((id) => processingStatus[id] === 'complete')

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#0a0e14', backgroundImage: "url('/grid-texture.svg')" }}
    >
      <div className="absolute top-4 right-6 z-10 flex items-center gap-3">
        {user ? (
          <>
            <span className="text-xs" style={{ color: '#9ca3af' }}>
              {String(user.email || user.id)}
            </span>
            <button
              onClick={() => void signOut()}
              className="px-3 py-1.5 rounded-lg text-sm"
              style={{ border: '1px solid #1a2235', color: '#e8e0d0' }}
            >
              Sign out
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push('/sign-in')}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#00d4aa', color: '#0a0e14' }}
          >
            Sign in
          </button>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 text-xs"
            style={{
              backgroundColor: '#111827',
              border: '1px solid #00d4aa22',
              color: '#00d4aa',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: '#00d4aa' }}
            />
            Lifelong Learning Agent · Butterbase × EverOS
          </div>

          <h1
            className="text-5xl md:text-6xl font-bold mb-4 leading-tight"
            style={{ color: '#e8e0d0', fontFamily: 'Syne, sans-serif' }}
          >
            Combo Papers
          </h1>

          <p
            className="text-lg mb-8 max-w-xl mx-auto leading-relaxed"
            style={{ color: '#9ca3af', fontFamily: 'IBM Plex Serif, serif' }}
          >
            Not a paper search box — a persistent mentor that plans your path, remembers what
            you struggle with, and turns research into interactive learning that compounds.
          </p>

          <button
            onClick={handleOpenDemo}
            className="mb-4 px-5 py-2.5 rounded-lg text-sm transition-all"
            style={{
              backgroundColor: '#111827',
              color: '#f5a623',
              border: '1px solid #f5a62333',
            }}
          >
            → Try demo: Mechanistic Interpretability
          </button>

          <div className="mb-8 flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => router.push('/saved')}
              className="px-4 py-2 rounded-lg text-sm transition-all"
              style={{
                backgroundColor: '#111827',
                color: '#00d4aa',
                border: '1px solid #00d4aa33',
              }}
            >
              Saved Papers
            </button>
            {!configured && (
              <span className="text-xs" style={{ color: '#9ca3af' }}>
                Demo mode · add Butterbase keys when ready
              </span>
            )}
          </div>
        </div>

        <div className="mb-12">
          <SearchInput onSearch={handleSearch} isLoading={status === 'searching'} />
        </div>

        {status === 'searching' && (
          <div className="text-center py-8">
            <div className="text-2xl mb-3 animate-spin inline-block">⟳</div>
            <p style={{ color: '#9ca3af' }}>Mentor agent planning your learning path…</p>
            <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
              Searching journals + preprints · ranking by relevance · drafting curriculum
            </p>
          </div>
        )}

        {error && (
          <div className="text-center py-4">
            <p style={{ color: '#f5a623' }}>{error}</p>
          </div>
        )}

        {mentor && (status === 'results' || status === 'processing') && (
          <div
            className="mb-6 p-4 rounded-xl"
            style={{ backgroundColor: '#111827', border: '1px solid #00d4aa33' }}
          >
            <p className="text-xs mb-2 uppercase tracking-wide" style={{ color: '#00d4aa' }}>
              Mentor · {mentor.mode}
              {institutionalDomain ? ` · ${institutionalDomain}` : ''}
            </p>
            <p
              className="text-sm leading-relaxed mb-3"
              style={{ color: '#e8e0d0', fontFamily: 'IBM Plex Serif, serif' }}
            >
              {mentor.message}
            </p>
            {mentor.plan && (
              <ol className="space-y-1.5 text-xs" style={{ color: '#9ca3af' }}>
                {mentor.plan.steps.slice(0, 6).map((step, i) => (
                  <li key={step.id}>
                    {i + 1}. [{step.kind}] {step.title}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {(status === 'results' || status === 'processing') && papers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2
                  className="font-display"
                  style={{ color: '#e8e0d0', fontFamily: 'Syne, sans-serif' }}
                >
                  {papers.length} papers found
                </h2>
                <p className="text-xs" style={{ color: '#9ca3af' }}>
                  via {searchSource} · {selectedIds.length} selected
                </p>
              </div>

              <button
                onClick={handleProcessSelected}
                disabled={selectedIds.length === 0 || status === 'processing'}
                className="px-5 py-2.5 rounded-lg text-sm font-display transition-all"
                style={{
                  backgroundColor: selectedIds.length === 0 ? '#1a2235' : '#00d4aa',
                  color: selectedIds.length === 0 ? '#9ca3af' : '#0a0e14',
                }}
              >
                {status === 'processing'
                  ? `Processing ${Object.values(processingStatus).filter((s) => s === 'complete').length}/${selectedIds.length}...`
                  : `Begin path · ${selectedIds.length} paper${selectedIds.length !== 1 ? 's' : ''} →`}
              </button>
            </div>

            <PaperList
              papers={papers}
              onSelectPaper={handlePaperToggle}
              selectedIds={selectedIds}
              processingStatus={processingStatus}
            />

            {status === 'processing' && anyComplete && (
              <div
                className="mt-4 p-3 rounded-lg text-center animate-fade-in"
                style={{ backgroundColor: '#111827', border: '1px solid #00d4aa22' }}
              >
                <p className="text-sm" style={{ color: '#00d4aa' }}>
                  First paper ready — start the living page now
                </p>
                <button
                  onClick={() => {
                    const firstComplete = selectedIds.find(
                      (id) => processingStatus[id] === 'complete'
                    )
                    if (firstComplete)
                      router.push(`/paper/${encodeURIComponent(firstComplete)}`)
                  }}
                  className="mt-2 text-xs px-3 py-1.5 rounded"
                  style={{ backgroundColor: '#00d4aa', color: '#0a0e14' }}
                >
                  Start reading →
                </button>
              </div>
            )}
          </div>
        )}

        {status === 'idle' && (
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: '◎',
                title: 'Persistent Mentor',
                desc: 'Plans curricula, tracks gaps, adapts over sessions via EverOS memory — not one-shot Q&A.',
              },
              {
                icon: '∑',
                title: 'Living Papers',
                desc: 'Equations, variables, evidence chains, and runnable notebooks — the paper becomes the classroom.',
              },
              {
                icon: '◈',
                title: 'Journal-Grade Access',
                desc: 'Institutional email unlocks Unpaywall + library proxy paths beyond arXiv preprints.',
              },
              {
                icon: '?',
                title: 'Prerequisite Agent',
                desc: '"I don\'t understand" surfaces the missing concept and rewires the learning plan.',
              },
              {
                icon: '⟳',
                title: 'Butterbase Backend',
                desc: 'Auth, Postgres, storage, functions, deploy — zero config so you ship the agent, not the plumbing.',
              },
              {
                icon: '⚡',
                title: 'Agent-Native Path',
                desc: 'Built for Beta Fund: pedagogy + deployment + trust, not just model capability.',
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="p-4 rounded-xl"
                style={{ backgroundColor: '#111827', border: '1px solid #1a2235' }}
              >
                <div className="text-2xl mb-2 font-mono" style={{ color: '#00d4aa' }}>
                  {icon}
                </div>
                <h3
                  className="font-display text-sm font-medium mb-1"
                  style={{ color: '#e8e0d0', fontFamily: 'Syne, sans-serif' }}
                >
                  {title}
                </h3>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: '#9ca3af', fontFamily: 'IBM Plex Serif, serif' }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
