'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import { ProcessedPaper, ReadingMode, Citation, RabbitHoleItem, ConceptMapNode } from '@/lib/types'
import HeaderZone from '@/components/LivingPage/HeaderZone'
import SectionRenderer from '@/components/LivingPage/SectionRenderer'
import ReadingStatusBar from '@/components/LivingPage/ReadingStatusBar'
import CitationGraph from '@/components/CitationGraph/CitationGraph'
import NotebookEmbed from '@/components/Notebook/NotebookEmbed'
import RabbitHoleStack from '@/components/RabbitHole/RabbitHoleStack'
import RabbitHolePanel from '@/components/RabbitHole/RabbitHolePanel'
import GlossarySidebar from '@/components/Glossary/GlossarySidebar'
import KeyboardShortcuts from '@/components/Navigation/KeyboardShortcuts'
import ConceptMap from '@/components/ConceptMap/ConceptMap'
import SoundToggle, { playAction } from '@/components/LivingPage/SoundToggle'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useDepthMeter } from '@/hooks/useDepthMeter'
import { useRabbitHole } from '@/hooks/useRabbitHole'
import demoData from '@/data/demo-fallback.json'
import { useLearnerId } from '@/hooks/useLearnerId'
import type { ArticleAnalysis } from '@/app/api/analyze-articles/route'
import type { DiscoveredArticle } from '@/app/api/browser-use/route'
import { safeEncodeId } from '@/lib/urlUtils'

export default function PaperPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeThreadId = searchParams.get('thread')
  const { userId: learnerUserId, email: learnerEmail, authHeaders } = useLearnerId()
  const [paper, setPaper] = useState<ProcessedPaper | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [readingMode, setReadingMode] = useState<ReadingMode>('read')
  const [showCitationGraph, setShowCitationGraph] = useState(false)
  const [showNotebook, setShowNotebook] = useState(false)
  const [showGlossary, setShowGlossary] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showConceptMap, setShowConceptMap] = useState(true)
  const [showRabbitHolePanel, setShowRabbitHolePanel] = useState(false)
  const [citationFilter, setCitationFilter] = useState<'all' | 'foundational' | 'recent'>('all')
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [relatedMemories, setRelatedMemories] = useState<string[]>([])
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [discoveredArticles, setDiscoveredArticles] = useState<DiscoveredArticle[]>([])
  const [articleAnalysis, setArticleAnalysis] = useState<ArticleAnalysis | null>(null)
  const [conceptMapNodes, setConceptMapNodes] = useState<ConceptMapNode[]>([])
  const [seenBeforeSymbols, setSeenBeforeSymbols] = useState<Set<string>>(new Set())
  const [pdfFileId, setPdfFileId] = useState<string | null>(null)
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle')
  const [pdfStatusMsg, setPdfStatusMsg] = useState('')

  const paperRouteId = decodeURIComponent(String(params.id || ''))
  const { depth, recordAction } = useDepthMeter(paperRouteId)
  const {
    stack,
    current: rabbitHoleCurrent,
    currentIndex: rabbitHoleIndex,
    push: pushRabbitHole,
    goBack: rabbitHoleBack,
    goForward: rabbitHoleForward,
    jumpTo: jumpToRabbitHole,
  } = useRabbitHole()

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
    } catch {
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

  // Recall learner episodes from EverOS through the user-scoped learner API.
  useEffect(() => {
    if (!paper?.title || !learnerUserId) return
    fetch(
      `/api/learner?userId=${encodeURIComponent(learnerUserId)}&query=${encodeURIComponent(paper.title)}`,
      { headers: authHeaders }
    )
      .then(async (response) => {
        if (!response.ok) return
        const data = (await response.json()) as { memories?: string[] }
        setRelatedMemories(Array.isArray(data.memories) ? data.memories : [])
      })
      .catch(() => {})
  }, [paper?.title, learnerUserId, authHeaders])

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

  const sections = useMemo(() => paper?.sections || [], [paper?.sections])

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
    onToggleEquation: () => {
      const section = document.getElementById(sections[currentSectionIndex]?.id)
      ;(section?.querySelector('[data-equation-trigger]') as HTMLElement | null)?.click()
    },
    onToggleNotebook: () => setShowNotebook(v => !v),
    onToggleCitationGraph: () => setShowCitationGraph(v => !v),
    onSwitchReadingMode: () => {
      const modes: ReadingMode[] = ['skim', 'read', 'deep-dive']
      const next = modes[(modes.indexOf(readingMode) + 1) % modes.length]
      setReadingMode(next)
    },
    onFullscreenFigure: () => {
      const section = document.getElementById(sections[currentSectionIndex]?.id)
      ;(section?.querySelector('[data-figure-trigger]') as HTMLElement | null)?.click()
    },
    onDontUnderstand: () => {
      const section = document.getElementById(sections[currentSectionIndex]?.id)
      ;(section?.querySelector('[data-dont-understand]') as HTMLElement | null)?.click()
    },
    onRabbitHoleBack: rabbitHoleBack,
    onRabbitHoleForward: rabbitHoleForward,
    onShowHelp: () => setShowHelp(v => !v),
    onOpenSearch: () => router.push('/'),
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
      <div className="grid min-h-[70vh] place-items-center px-6" aria-live="polite">
        <div className="text-center">
          <p className="ui-label" style={{ color: 'var(--teal)' }}>
            Opening Living Page
          </p>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Restoring sections, notation, and labs…
          </p>
        </div>
      </div>
    )
  }

  if (!paper) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-6">
        <div className="ui-panel max-w-lg p-7 text-center">
          <p className="ui-label mb-3">Living Page unavailable</p>
          <h1 className="font-display text-2xl font-semibold">This paper is not in the workspace yet.</h1>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Process it from a research path, or open the guided demo to explore a complete Living Page.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button type="button" className="ui-button" onClick={() => router.push('/')}>
              Back to workspace
            </button>
            <button
              type="button"
              className="ui-button ui-button-primary"
              onClick={() => router.push('/paper/arxiv%3A2209.11895')}
            >
              Open guided demo
            </button>
          </div>
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
      <Script id="mathjax-config" strategy="beforeInteractive">
        {`window.MathJax = {
          tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']], displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']] },
          svg: { fontCache: 'global' }
        };`}
      </Script>
      <Script
        id="mathjax-runtime"
        src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"
        strategy="afterInteractive"
      />

      {/* Rabbit Hole Stack */}
      <RabbitHoleStack
        stack={stack}
        currentIndex={rabbitHoleIndex}
        onNavigate={(index) => {
          jumpToRabbitHole(index)
          setShowRabbitHolePanel(true)
        }}
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
        onVariableClick={(variable) => {
          recordAction('hoveredVariable')
          setShowGlossary(false)
          if (variable.firstSeenSectionId) {
            document
              .getElementById(variable.firstSeenSectionId)
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }}
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

      {/* Spatial reading workspace */}
      <div className="mx-auto grid max-w-[1380px] gap-7 px-4 pb-24 pt-7 md:px-7 xl:grid-cols-[230px_minmax(0,720px)_72px] xl:justify-center">
        <aside className="hidden space-y-4 xl:sticky xl:top-[calc(var(--app-header)+24px)] xl:block xl:self-start">
          <button
            type="button"
            onClick={() =>
              router.push(activeThreadId ? `/thread/${encodeURIComponent(activeThreadId)}` : '/')
            }
            className="ui-button ui-button-ghost -ml-2"
          >
            ← {activeThreadId ? 'Research path' : 'Workspace'}
          </button>

          <div className="ui-panel p-4">
            <p className="ui-label">In this paper</p>
            <nav className="mt-3" aria-label="Paper sections">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(index)}
                  className="flex w-full items-start gap-2 rounded-md px-1.5 py-2 text-left"
                  style={{
                    color:
                      currentSectionIndex === index ? 'var(--text)' : 'var(--text-muted)',
                    background:
                      currentSectionIndex === index ? 'var(--teal-soft)' : 'transparent',
                  }}
                >
                  <span className="mt-0.5 font-mono text-[9px]" style={{ color: 'var(--teal)' }}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="line-clamp-2 text-xs leading-relaxed">{section.title}</span>
                </button>
              ))}
            </nav>
          </div>

          {showConceptMap && (
            <ConceptMap
              embedded
              nodes={conceptMapNodes}
              onNodeClick={(node) => {
                if (node.sectionId) {
                  document
                    .getElementById(node.sectionId)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
            />
          )}
        </aside>

        <main className="min-w-0">
          <div className="mb-5 flex items-center justify-between xl:hidden">
            <button
              type="button"
              onClick={() =>
                router.push(activeThreadId ? `/thread/${encodeURIComponent(activeThreadId)}` : '/')
              }
              className="ui-button ui-button-ghost"
            >
              ← {activeThreadId ? 'Path' : 'Workspace'}
            </button>
            <span className="ui-chip">
              {currentSectionIndex + 1}/{sections.length || 0}
            </span>
          </div>

          {relatedMemories.length > 0 && (
            <div
              className="mb-4 rounded-lg border px-3 py-2 text-xs"
              style={{
                borderColor: 'rgba(79, 209, 181, 0.25)',
                color: 'var(--teal)',
                background: 'var(--teal-soft)',
              }}
            >
              Your mentor recalled {relatedMemories.length} related learning episode
              {relatedMemories.length === 1 ? '' : 's'}.
            </div>
          )}

          <HeaderZone
            paper={paper}
            readingMode={readingMode}
            onReadingModeChange={setReadingMode}
          />

          <div
            className="sticky top-[var(--app-header)] z-30 -mx-2 mb-8 flex gap-1 overflow-x-auto border-y px-2 py-2 backdrop-blur-xl xl:hidden"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'rgba(8, 11, 16, 0.9)',
            }}
          >
            <button type="button" className="ui-button" onClick={() => setShowCitationGraph(true)}>
              Explore
            </button>
            <button type="button" className="ui-button" onClick={() => setShowNotebook(true)}>
              Lab
            </button>
            <button type="button" className="ui-button" onClick={() => setShowGlossary(true)}>
              Terms
            </button>
            <SoundToggle denser={readingMode === 'deep-dive'} />
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
                headers: { 'Content-Type': 'application/json', ...authHeaders },
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
            authHeaders={authHeaders}
          />
        ))}

        {/* One-more transition — next paper in thread */}
        {(() => {
          try {
            const threadKeys = activeThreadId
              ? [`thread:${activeThreadId}`]
              : Object.keys(sessionStorage).filter((key) => key.startsWith('thread:'))
            for (const key of threadKeys) {
              const exp = JSON.parse(sessionStorage.getItem(key) || 'null') as {
                papers?: Array<{ id?: string; title: string; relevanceReason?: string }>
              } | null
              if (!exp?.papers) continue
              const idx = exp.papers.findIndex((p) => p.id === paper.id)
              const next = idx >= 0 ? exp.papers[idx + 1] : null
              if (!next?.id) continue
              return (
                <button
                  type="button"
                  className="ui-panel group mb-8 mt-16 w-full p-5 text-left"
                  onClick={() => {
                    if (activeThreadId && paper.id) {
                      try {
                        const progressKey = `thread-progress:${activeThreadId}`
                        const completed = JSON.parse(localStorage.getItem(progressKey) || '[]') as string[]
                        localStorage.setItem(progressKey, JSON.stringify(Array.from(new Set([...completed, paper.id]))))
                      } catch {
                        // Progress is additive; navigation should never be blocked.
                      }
                    }
                    router.push(
                      `/paper/${encodeURIComponent(next.id!)}${
                        activeThreadId ? `?thread=${encodeURIComponent(activeThreadId)}` : ''
                      }`
                    )
                  }}
                >
                  <p className="ui-label mb-2" style={{ color: 'var(--teal)' }}>
                    Continue the path
                  </p>
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-display text-base font-semibold">
                    {next.title}
                    </p>
                    <span className="font-mono transition-transform group-hover:translate-x-1">→</span>
                  </div>
                  {next.relevanceReason && (
                    <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {next.relevanceReason}
                    </p>
                  )}
                </button>
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

      </main>

        <aside className="hidden xl:block">
          <div
            className="sticky top-[calc(var(--app-header)+24px)] space-y-1 rounded-xl border p-1.5"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            aria-label="Paper tools"
          >
            {[
              {
                label: 'Explore citations',
                short: 'Explore',
                symbol: '◎',
                action: () => setShowCitationGraph(true),
              },
              {
                label: 'Open interactive lab',
                short: 'Lab',
                symbol: '⌬',
                action: () => setShowNotebook(true),
              },
              {
                label: 'Open terms and notation',
                short: 'Terms',
                symbol: 'Ω',
                action: () => setShowGlossary(true),
              },
              {
                label: showConceptMap ? 'Hide concept map' : 'Show concept map',
                short: 'Map',
                symbol: '⌘',
                action: () => setShowConceptMap((value) => !value),
              },
              {
                label: 'Discover related work',
                short: discoverLoading ? 'Finding' : 'Related',
                symbol: discoverLoading ? '…' : '↗',
                action: handleDiscoverRelated,
                disabled: discoverLoading,
              },
              {
                label: 'Keyboard shortcuts',
                short: 'Keys',
                symbol: '?',
                action: () => setShowHelp(true),
              },
            ].map((tool) => (
              <button
                key={tool.short}
                type="button"
                className="flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors hover:bg-white/[0.035] disabled:opacity-40"
                onClick={tool.action}
                disabled={tool.disabled}
                title={tool.label}
                aria-label={tool.label}
              >
                <span className="font-mono text-sm" style={{ color: 'var(--teal)' }}>
                  {tool.symbol}
                </span>
                <span className="font-display text-[9px]" style={{ color: 'var(--text-muted)' }}>
                  {tool.short}
                </span>
              </button>
            ))}
            <div className="my-1 h-px" style={{ background: 'var(--border-subtle)' }} />
            {pdfFileId ? (
              <a
                href={`/api/papers/${safeEncodeId(params.id as string)}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 rounded-lg px-1 py-2"
                title="Open saved PDF"
              >
                <span className="font-mono text-sm" style={{ color: 'var(--teal)' }}>⇩</span>
                <span className="font-display text-[9px]" style={{ color: 'var(--text-muted)' }}>PDF</span>
              </a>
            ) : (
              <button
                type="button"
                className="flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2 disabled:opacity-40"
                onClick={() => void handleSavePdf()}
                disabled={pdfStatus === 'generating'}
                title="Save a reading copy"
              >
                <span className="font-mono text-sm" style={{ color: pdfStatus === 'error' ? 'var(--danger)' : 'var(--teal)' }}>
                  {pdfStatus === 'generating' ? '…' : '⇩'}
                </span>
                <span className="font-display text-[9px]" style={{ color: 'var(--text-muted)' }}>
                  {pdfStatus === 'generating' ? pdfStatusMsg : 'Export'}
                </span>
              </button>
            )}
          </div>
          <div className="mt-3 flex justify-center">
            <SoundToggle denser={readingMode === 'deep-dive'} />
          </div>
        </aside>
      </div>

      <ReadingStatusBar
        sectionTitle={sections[currentSectionIndex]?.title}
        sectionIndex={currentSectionIndex}
        sectionCount={sections.length}
        depth={depth}
        terms={(paper.variables || []).slice(0, 8).map((v) => ({
          term: v.symbol,
          definition: v.definition || v.name,
        }))}
        onPrevious={() => scrollToSection(currentSectionIndex - 1)}
        onNext={() => scrollToSection(currentSectionIndex + 1)}
      />
    </div>
  )
}
