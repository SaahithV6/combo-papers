'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProcessedPaper, ReadingMode, Citation, RabbitHoleItem, ConceptMapNode } from '@/lib/types'
import HeaderZone from '@/components/LivingPage/HeaderZone'
import SectionRenderer from '@/components/LivingPage/SectionRenderer'
import DepthMeter from '@/components/LivingPage/DepthMeter'
import CitationGraph from '@/components/CitationGraph/CitationGraph'
import NotebookEmbed from '@/components/Notebook/NotebookEmbed'
import RabbitHoleStack from '@/components/RabbitHole/RabbitHoleStack'
import RabbitHolePanel from '@/components/RabbitHole/RabbitHolePanel'
import GlossarySidebar from '@/components/Glossary/GlossarySidebar'
import KeyboardShortcuts from '@/components/Navigation/KeyboardShortcuts'
import ConceptMap from '@/components/ConceptMap/ConceptMap'
import SpacedReExposureStrip from '@/components/LivingPage/SpacedReExposureStrip'
import SoundToggle, { playAction } from '@/components/LivingPage/SoundToggle'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useDepthMeter } from '@/hooks/useDepthMeter'
import { useRabbitHole } from '@/hooks/useRabbitHole'
import demoData from '@/data/demo-fallback.json'
import { useButterbaseAuth } from '@/components/ButterbaseProvider'
import { useLearnerId } from '@/hooks/useLearnerId'
import type { ArticleAnalysis } from '@/app/api/analyze-articles/route'
import type { DiscoveredArticle } from '@/app/api/browser-use/route'
import { safeEncodeId } from '@/lib/urlUtils'

interface SupermemoryResult {
  content: string
  metadata: { title: string; sourceUrl: string; paperId?: string }
  score: number
}

export default function PaperPage() {
  const params = useParams()
  const router = useRouter()
  const { user, signOut } = useButterbaseAuth()
  const { userId: learnerUserId, email: learnerEmail } = useLearnerId()
  const [paper, setPaper] = useState<ProcessedPaper | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [readingMode, setReadingMode] = useState<ReadingMode>('read')
  const [showCitationGraph, setShowCitationGraph] = useState(false)
  const [showNotebook, setShowNotebook] = useState(false)
  const [showGlossary, setShowGlossary] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showRabbitHolePanel, setShowRabbitHolePanel] = useState(false)
  const [citationFilter, setCitationFilter] = useState<'all' | 'foundational' | 'recent'>('all')
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [relatedMemories, setRelatedMemories] = useState<SupermemoryResult[]>([])
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [discoveredArticles, setDiscoveredArticles] = useState<DiscoveredArticle[]>([])
  const [articleAnalysis, setArticleAnalysis] = useState<ArticleAnalysis | null>(null)
  const [conceptMapNodes, setConceptMapNodes] = useState<ConceptMapNode[]>([])
  const [seenBeforeSymbols, setSeenBeforeSymbols] = useState<Set<string>>(new Set())
  const [pdfFileId, setPdfFileId] = useState<string | null>(null)
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle')
  const [pdfStatusMsg, setPdfStatusMsg] = useState('')
  const sectionRefs = useRef<HTMLElement[]>([])

  const { depth, recordAction } = useDepthMeter()
  const { stack, current: rabbitHoleCurrent, currentIndex: rabbitHoleIndex, push: pushRabbitHole, goBack: rabbitHoleBack, goForward: rabbitHoleForward } = useRabbitHole()

  // Load paper data — try demo data first, then sessionStorage, then MongoDB (with 30s timeout)
  useEffect(() => {
    const id = params.id as string
    if (!id) return

    const decodedId = decodeURIComponent(id)

    // Check demo data first
    const demoPaper = demoData.papers.find(p => p.id === decodedId || p.id.replace('arxiv:', '') === decodedId)
    if (demoPaper) {
      setPaper(demoPaper as unknown as ProcessedPaper)
      setIsLoading(false)
      return
    }

    // Load from sessionStorage (papers processed during search)
    try {
      const stored = sessionStorage.getItem(`paper:${decodedId}`)
      if (stored) {
        setPaper(JSON.parse(stored))
        setIsLoading(false)
        return
      }
    } catch (e) {
      // ignore
    }

    // Try MongoDB via API
    let mounted = true
    fetch(`/api/papers/${encodeURIComponent(decodedId)}`)
      .then(async (res) => {
        if (res.ok && mounted) {
          const data = await res.json() as ProcessedPaper
          setPaper(data)
        }
      })
      .catch(() => {/* MongoDB unavailable — silently ignore */})
      .finally(() => { if (mounted) setIsLoading(false) })

    const timeoutId = setTimeout(() => {
      if (mounted) setIsLoading(false)
    }, 30000)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [params.id])

  // Query Supermemory for cross-session recall (non-blocking)
  useEffect(() => {
    if (!paper?.title) return
    fetch('/api/prerequisite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paragraph: paper.title, paperTitle: paper.title, mode: 'recall' }),
    }).catch(() => {/* skip */})

    // Directly query supermemory for related papers
    ;(async () => {
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: `related:${paper.title}`, recallOnly: true }),
        })
        if (res.ok) {
          const data = await res.json() as { memories?: SupermemoryResult[] }
          if (data.memories && data.memories.length > 0) {
            setRelatedMemories(data.memories)
          }
        }
      } catch {
        // Supermemory unavailable — silently skip
      }
    })()
  }, [paper?.title])

  // Build concept map nodes from paper data
  useEffect(() => {
    if (!paper) return
    const paperId = (paper as ProcessedPaper & { id?: string }).id || paper.title
    const nodes: ConceptMapNode[] = [
      { id: paperId, label: paper.title, type: 'paper' },
      ...(paper.variables || []).map(v => ({
        id: `var:${v.symbol}`,
        label: `${v.symbol}: ${v.name}`,
        type: 'variable' as const,
        sectionId: v.firstSeenSectionId,
      })),
    ]
    setConceptMapNodes(nodes)
  }, [paper])

  // Cross-paper concept threading: amber underline for symbols seen earlier in the session
  useEffect(() => {
    if (!paper) return
    try {
      const raw = sessionStorage.getItem('session:seenSymbols')
      const prior = raw ? (JSON.parse(raw) as string[]) : []
      const current = (paper.variables || []).map((v) => v.symbol)
      setSeenBeforeSymbols(new Set(prior.filter((s) => current.includes(s))))
      sessionStorage.setItem(
        'session:seenSymbols',
        JSON.stringify(Array.from(new Set([...prior, ...current])))
      )
    } catch {
      setSeenBeforeSymbols(new Set())
    }
  }, [paper])

  const sections = paper?.sections || []

  // Track current section via IntersectionObserver
  useEffect(() => {
    if (!sections.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = sections.findIndex(s => s.id === entry.target.id)
            if (idx !== -1) setCurrentSectionIndex(idx)
          }
        }
      },
      // rootMargin: detect section when it occupies the middle 5% of the viewport
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    )
    sections.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections])

  const scrollToSection = (index: number) => {
    const clipped = Math.max(0, Math.min(index, sections.length - 1))
    setCurrentSectionIndex(clipped)
    const el = document.getElementById(sections[clipped]?.id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useKeyboardShortcuts({
    onNextSection: () => scrollToSection(currentSectionIndex + 1),
    onPrevSection: () => scrollToSection(currentSectionIndex - 1),
    onToggleNotebook: () => setShowNotebook(v => !v),
    onToggleCitationGraph: () => setShowCitationGraph(v => !v),
    onSwitchReadingMode: () => {
      const modes: ReadingMode[] = ['skim', 'read', 'deep-dive']
      const next = modes[(modes.indexOf(readingMode) + 1) % modes.length]
      setReadingMode(next)
    },
    onRabbitHoleBack: rabbitHoleBack,
    onRabbitHoleForward: rabbitHoleForward,
    onShowHelp: () => setShowHelp(v => !v),
  })

  const handleDiscoverRelated = async () => {
    if (!paper?.title || discoverLoading) return
    setDiscoverLoading(true)
    setDiscoveredArticles([])
    setArticleAnalysis(null)
    try {
      // Step 1: Discover articles
      const discoverRes = await fetch('/api/browser-use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: paper.title, maxResults: 15 }),
      })
      if (!discoverRes.ok) throw new Error('Discovery failed')
      const { articles } = await discoverRes.json() as { articles: DiscoveredArticle[] }
      setDiscoveredArticles(articles)

      // Step 2: Analyze with Claude
      if (articles.length > 0) {
        const analyzeRes = await fetch('/api/analyze-articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articles, topic: paper.title }),
        })
        if (analyzeRes.ok) {
          const { analysis } = await analyzeRes.json() as { analysis: ArticleAnalysis }
          setArticleAnalysis(analysis)
        }
      }
    } catch (e) {
      console.warn('Discover related failed:', e)
    } finally {
      setDiscoverLoading(false)
    }
  }

  // Check if a PDF is already saved for this paper
  useEffect(() => {
    if (!paper) return
    const id = params.id as string
    if (!id) return
    fetch(`/api/papers/${safeEncodeId(id)}/pdf`, { method: 'HEAD' })
      .then((res) => {
        if (res.ok) setPdfFileId(id)
      })
      .catch(() => {/* unavailable */})
  }, [paper, params.id])

  const handleSavePdf = async () => {
    if (!paper) return
    const id = params.id as string
    setPdfStatus('generating')
    setPdfStatusMsg('Starting...')
    try {
      const { generateAndUploadPdf } = await import('@/lib/generateClientPdf')
      await generateAndUploadPdf(id, paper.title, (msg) => setPdfStatusMsg(msg))
      setPdfFileId(id)
      setPdfStatus('success')
      setPdfStatusMsg('PDF saved!')
      setTimeout(() => { setPdfStatus('idle'); setPdfStatusMsg('') }, 3000)
    } catch (e) {
      console.warn('PDF save failed:', e)
      setPdfStatus('error')
      setPdfStatusMsg('Failed')
      setTimeout(() => { setPdfStatus('idle'); setPdfStatusMsg('') }, 3000)
    }
  }

  const handleCitationClick = (citation: Citation) => {
    const item: RabbitHoleItem = {
      id: citation.id,
      title: citation.title,
      type: 'paper',
      paperId: citation.id,
    }
    pushRabbitHole(item)
    setShowRabbitHolePanel(true)
    recordAction('clickedCitation')

    // Grow concept map with this citation as a rabbit hole node
    setConceptMapNodes(prev => {
      if (prev.some(n => n.id === `rh:${citation.id}`)) return prev
      return [...prev, { id: `rh:${citation.id}`, label: citation.title, type: 'rabbithole' as const }]
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⟳</div>
          <p className="text-text-muted">Loading paper...</p>
        </div>
      </div>
    )
  }

  if (!paper) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl mb-4 text-text">Paper not found</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 rounded bg-teal text-background"
          >
            Back to search
          </button>
        </div>
      </div>
    )
  }

  // Filter sections based on reading mode
  const visibleSections = readingMode === 'skim'
    ? sections.slice(0, 1)  // Abstract only in skim
    : sections

  return (
    <div className="min-h-screen bg-background">
      {/* MathJax */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.MathJax = {
              tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']], displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']] },
              svg: { fontCache: 'global' }
            };
          `,
        }}
      />
      <script
        src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"
        async
      />

      {/* Rabbit Hole Stack */}
      <RabbitHoleStack
        stack={stack}
        currentIndex={rabbitHoleIndex}
        onNavigate={(i) => {}}
      />

      {/* Rabbit Hole Panel */}
      {showRabbitHolePanel && rabbitHoleCurrent && (
        <RabbitHolePanel
          item={rabbitHoleCurrent}
          onGoDeeper={(item) => {
            setShowRabbitHolePanel(false)
            if (item.paperId) {
              router.push(`/paper/${encodeURIComponent(item.paperId)}`)
            }
          }}
          onClose={() => setShowRabbitHolePanel(false)}
        />
      )}

      {/* Glossary Sidebar */}
      <GlossarySidebar
        variables={paper.variables || []}
        isOpen={showGlossary}
        onClose={() => setShowGlossary(false)}
        onVariableClick={() => recordAction('hoveredVariable')}
      />

      {/* Notebook */}
      {showNotebook && (
        <NotebookEmbed
          paper={paper}
          isOpen={showNotebook}
          onClose={() => setShowNotebook(false)}
          onCellRun={() => {
            recordAction('ranNotebookCell')
            playAction('notebook')
          }}
        />
      )}

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcuts isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Citation Graph Overlay */}
      {showCitationGraph && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
            <div className="flex items-center gap-4">
              <h2 className="font-display text-text" style={{ fontFamily: 'Syne, sans-serif' }}>
                Citation Graph
              </h2>
              <div className="flex gap-1">
                {(['all', 'foundational', 'recent'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setCitationFilter(f)}
                    className={`text-xs px-2.5 py-1 rounded transition-all capitalize ${citationFilter === f ? 'bg-teal text-background' : 'bg-surface-2 text-text-muted'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowCitationGraph(false)}
              className="px-3 py-1.5 rounded text-sm bg-surface-2 text-text-muted"
            >
              Close (C)
            </button>
          </div>
          <div className="flex-1">
            <CitationGraph
              citations={paper.citations || []}
              paperTitle={paper.title}
              onCitationClick={handleCitationClick}
              filter={citationFilter}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Back button */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm transition-all text-text-muted"
          >
            ← Back to search
          </button>
          <div className="flex items-center gap-2">
            {user ? (
              <button
                onClick={() => void signOut()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ border: '1px solid #1a2235', color: '#e8e0d0' }}
              >
                Sign out
              </button>
            ) : (
              <button
                onClick={() => router.push('/sign-in')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal text-background"
              >
                Sign in
              </button>
            )}
          </div>
        </div>

        {/* Previously read indicator */}
        {relatedMemories.length > 0 && (
          <div className="mb-4 px-3 py-2 rounded border border-teal/30 bg-teal/5 text-xs text-teal">
            📚 You&apos;ve explored {relatedMemories.length} related paper{relatedMemories.length > 1 ? 's' : ''} before
          </div>
        )}

        <HeaderZone
          paper={paper}
          readingMode={readingMode}
          onReadingModeChange={setReadingMode}
          readersOnline={paper.readersOnline ?? 2 + ((paper.title?.length || 0) % 4)}
        />

        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          <button
            onClick={() => setShowCitationGraph(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-all bg-surface text-text-muted border border-surface-2"
            title="Citation graph (C)"
          >
            ⬡ Citations
          </button>
          <button
            onClick={() => setShowNotebook(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-all bg-surface text-text-muted border border-surface-2"
            title="Notebook (N)"
          >
            ⌥ Notebook
          </button>
          <button
            onClick={() => setShowGlossary(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-all bg-surface text-text-muted border border-surface-2"
          >
            Ω Glossary
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-all bg-surface text-text-muted border border-surface-2"
            title="Keyboard shortcuts (?)"
          >
            ? Shortcuts
          </button>
          <SoundToggle denser={readingMode === 'deep-dive'} />
          <button
            onClick={handleDiscoverRelated}
            disabled={discoverLoading}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-all bg-surface border border-surface-2 disabled:opacity-50 ${discoverLoading ? 'text-text-muted' : 'text-amber'}`}
          >
            {discoverLoading ? <><span className="animate-spin">⟳</span> Discovering...</> : '🔍 Discover Related'}
          </button>
          {pdfFileId ? (
            <a
              href={`/api/papers/${safeEncodeId(params.id as string)}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-all bg-surface text-teal border border-teal/30"
            >
              📄 View PDF
            </a>
          ) : (
            <button
              onClick={handleSavePdf}
              disabled={pdfStatus === 'generating'}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-all bg-surface border border-surface-2 disabled:opacity-50 ${pdfStatus === 'error' ? 'text-red-400' : pdfStatus === 'success' ? 'text-teal' : 'text-text-muted'}`}
            >
              {pdfStatus === 'generating'
                ? <><span className="animate-spin">⟳</span> {pdfStatusMsg}</>
                : pdfStatus === 'success'
                ? `✓ ${pdfStatusMsg}`
                : pdfStatus === 'error'
                ? `✗ ${pdfStatusMsg}`
                : '📄 Save PDF'}
            </button>
          )}
        </div>

        {/* Sections */}
        {visibleSections.map((section, i) => (
          <SectionRenderer
            key={section.id}
            section={section}
            variables={paper.variables || []}
            equations={paper.equations || []}
            figures={paper.figures || []}
            paperTitle={paper.title}
            readingMode={readingMode}
            onEquationExpand={() => {
              recordAction('expandedEquation')
              playAction('equation')
            }}
            onVariableHover={() => recordAction('hoveredVariable')}
            evidenceChains={i === visibleSections.length - 1 ? paper.evidenceChains : []}
            notebookCells={(paper.notebookCells || []).filter(c => c.sectionId === section.id)}
            onOpenNotebook={() => setShowNotebook(true)}
            notationWarnings={paper.notationWarnings || []}
            showCheckpoint={readingMode !== 'skim' && (i === 1 || i === Math.floor(visibleSections.length / 2))}
            onCheckpoint={(response) => {
              recordAction('hoveredVariable')
              playAction('checkpoint')
              void fetch('/api/agent/adapt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  eventType: response.length < 12 ? 'checkpoint_fail' : 'checkpoint_pass',
                  concept: section.title,
                  paperTitle: paper.title,
                  paperId: paper.id,
                  userId: learnerUserId,
                  email: learnerEmail,
                }),
              }).catch(() => {})
            }}
            seenBeforeSymbols={seenBeforeSymbols}
            learnerUserId={learnerUserId}
            learnerEmail={learnerEmail}
            paperId={paper.id}
          />
        ))}

        {/* One-more transition — next paper in thread */}
        {(() => {
          try {
            const threadKeys = Object.keys(sessionStorage).filter((k) => k.startsWith('thread:'))
            for (const key of threadKeys) {
              const exp = JSON.parse(sessionStorage.getItem(key) || 'null') as {
                papers?: Array<{ id?: string; title: string; relevanceReason?: string }>
              } | null
              if (!exp?.papers) continue
              const idx = exp.papers.findIndex((p) => p.id === paper.id)
              const next = idx >= 0 ? exp.papers[idx + 1] : null
              if (!next?.id) continue
              return (
                <div
                  className="mt-16 mb-8 p-5 rounded-xl cursor-pointer"
                  style={{ backgroundColor: '#111827', border: '1px solid #00d4aa33' }}
                  onClick={() => router.push(`/paper/${encodeURIComponent(next.id!)}`)}
                >
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#00d4aa' }}>
                    Continue the path
                  </p>
                  <p className="text-sm font-medium" style={{ color: '#e8e0d0' }}>
                    {next.title}
                  </p>
                  {next.relevanceReason && (
                    <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                      {next.relevanceReason}
                    </p>
                  )}
                </div>
              )
            }
          } catch {
            /* ignore */
          }
          return null
        })()}

        {/* Discover Related Papers results */}
        {(discoveredArticles.length > 0 || articleAnalysis) && (
          <section className="mt-12 pt-8 border-t border-surface-2">
            <h2 className="text-xl font-display text-text mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
              🔍 Related Papers
            </h2>

            {articleAnalysis && (
              <div className="mb-6 p-4 rounded-lg bg-surface border border-surface-2">
                <p className="text-sm text-text-muted mb-3 font-serif leading-relaxed">{articleAnalysis.summary}</p>
                {articleAnalysis.synthesis && (
                  <p className="text-sm text-text font-serif leading-relaxed">{articleAnalysis.synthesis}</p>
                )}
              </div>
            )}

            {articleAnalysis?.mostRelevant && articleAnalysis.mostRelevant.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-display uppercase tracking-wider text-teal mb-3">Most Relevant</h3>
                <div className="space-y-3">
                  {articleAnalysis.mostRelevant.map((a, i) => (
                    <div key={i} className="p-3 rounded bg-surface border border-surface-2">
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-teal hover:underline"
                      >
                        {a.title}
                      </a>
                      <p className="text-xs text-text-muted mt-1">{a.reason}</p>
                      {a.keyFindings.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {a.keyFindings.map((f, j) => (
                            <li key={j} className="text-xs text-text-muted">• {f}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {articleAnalysis?.researchBrief && (
              <div className="mb-6 p-4 rounded-lg bg-surface border border-amber/20">
                <h3 className="text-sm font-display uppercase tracking-wider text-amber mb-2">Research Brief</h3>
                <p className="text-sm text-text font-serif leading-relaxed whitespace-pre-line">
                  {articleAnalysis.researchBrief}
                </p>
              </div>
            )}

            {discoveredArticles.length > 0 && (
              <div>
                <h3 className="text-sm font-display uppercase tracking-wider text-text-muted mb-3">
                  All Discovered ({discoveredArticles.length})
                </h3>
                <div className="space-y-2">
                  {discoveredArticles.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 rounded hover:bg-surface transition-colors">
                      <span className="text-xs text-text-muted font-mono mt-0.5 w-6 shrink-0">{i + 1}</span>
                      <div className="min-w-0">
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-text hover:text-teal transition-colors"
                        >
                          {a.title}
                        </a>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-text-muted">{a.source}</span>
                          {a.year && <span className="text-xs text-text-muted">{a.year}</span>}
                          {a.citation_count != null && (
                            <span className="text-xs text-text-muted">{a.citation_count.toLocaleString()} citations</span>
                          )}
                          {a.pdf_url && (
                            <a
                              href={a.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-teal hover:underline"
                            >
                              PDF ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Citations section */}
        {paper.citations && paper.citations.length > 0 && (
          <section className="mt-12 pt-8 border-t border-surface-2">
            <h2 className="text-xl font-display text-text mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
              References
            </h2>
            <div className="space-y-3">
              {paper.citations.map((citation) => (
                <div
                  key={citation.id}
                  className={`p-3 rounded border transition-colors ${citation.isFoundational ? 'border-amber/30 bg-amber/5' : 'border-surface-2 bg-surface'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${citation.isFoundational ? 'text-amber' : 'text-text'}`}>
                        {citation.title}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {citation.authors.slice(0, 3).join(', ')}{citation.authors.length > 3 ? ' et al.' : ''}{citation.year ? ` · ${citation.year}` : ''}
                        {citation.isFoundational && <span className="ml-2 text-amber">★ Foundational</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCitationClick(citation)}
                      className="shrink-0 text-xs px-2 py-1 rounded bg-surface-2 text-text-muted hover:text-teal transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section navigation */}
        {sections.length > 1 && (
          <div className="sticky bottom-6 flex justify-center gap-2 mt-8">
            <button
              onClick={() => scrollToSection(currentSectionIndex - 1)}
              disabled={currentSectionIndex === 0}
              className="px-4 py-2 rounded-lg text-sm bg-surface text-text-muted border border-surface-2 disabled:opacity-40"
            >
              ↑ Prev (K)
            </button>
            <span className="px-3 py-2 text-xs font-mono text-text-muted">
              {currentSectionIndex + 1} / {sections.length}
            </span>
            <button
              onClick={() => scrollToSection(currentSectionIndex + 1)}
              disabled={currentSectionIndex === sections.length - 1}
              className="px-4 py-2 rounded-lg text-sm bg-surface text-text-muted border border-surface-2 disabled:opacity-40"
            >
              ↓ Next (J)
            </button>
          </div>
        )}
      </main>

      {/* Concept Map — ambient growing widget */}
      <ConceptMap
        nodes={conceptMapNodes}
        onNodeClick={(node) => {
          if (node.sectionId) {
            const el = document.getElementById(node.sectionId)
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }}
      />

      {/* Depth Meter */}
      <DepthMeter depth={depth} />

      <SpacedReExposureStrip
        terms={(paper.variables || []).slice(0, 8).map((v) => ({
          term: v.symbol,
          definition: v.definition || v.name,
          section: v.firstSeenSectionId || 'earlier',
        }))}
      />
    </div>
  )
}
