'use client'

import { useEffect, useState } from 'react'

interface ReadingStatusBarProps {
  sectionTitle?: string
  sectionIndex: number
  sectionCount: number
  depth: number
  terms: Array<{ term: string; definition: string }>
  onPrevious: () => void
  onNext: () => void
}

export default function ReadingStatusBar({
  sectionTitle,
  sectionIndex,
  sectionCount,
  depth,
  terms,
  onPrevious,
  onNext,
}: ReadingStatusBarProps) {
  const [termIndex, setTermIndex] = useState(0)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (terms.length < 2) return
    const interval = window.setInterval(() => {
      setExpanded(false)
      setTermIndex((value) => (value + 1) % terms.length)
    }, 9000)
    return () => window.clearInterval(interval)
  }, [terms.length])

  const term = terms[termIndex]
  const percent = Math.round(depth * 100)

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[70] border-t backdrop-blur-xl"
      style={{
        minHeight: 'var(--status-bar)',
        borderColor: 'var(--border)',
        background: 'rgba(8, 11, 16, 0.92)',
      }}
    >
      <div className="mx-auto flex min-h-[var(--status-bar)] max-w-[1380px] items-center gap-3 px-3 md:px-6">
        <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
          <span className="ui-label shrink-0">Section</span>
          <span className="truncate text-xs" style={{ color: 'var(--text-secondary)' }}>
            {sectionTitle || 'Overview'}
          </span>
        </div>

        {term && (
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left md:max-w-md"
            onClick={() => setExpanded((value) => !value)}
            title={term.definition}
          >
            <span className="ui-label shrink-0">Recall</span>
            <span className="shrink-0 font-mono text-xs" style={{ color: 'var(--teal)' }}>
              {term.term}
            </span>
            <span className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
              {expanded ? term.definition : `— ${term.definition}`}
            </span>
          </button>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="ui-button ui-button-ghost !min-h-[30px] !px-2"
            onClick={onPrevious}
            disabled={sectionIndex === 0}
            aria-label="Previous section"
            title="Previous section (K)"
          >
            ↑
          </button>
          <span className="min-w-[42px] text-center font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {sectionCount ? sectionIndex + 1 : 0}/{sectionCount}
          </span>
          <button
            type="button"
            className="ui-button ui-button-ghost !min-h-[30px] !px-2"
            onClick={onNext}
            disabled={sectionIndex >= sectionCount - 1}
            aria-label="Next section"
            title="Next section (J)"
          >
            ↓
          </button>
        </div>

        <div className="hidden items-center gap-2 sm:flex" title="Reading depth">
          <span className="ui-label">Depth</span>
          <div className="h-1 w-14 overflow-hidden rounded-full" style={{ background: 'var(--surface-strong)' }}>
            <div className="h-full rounded-full" style={{ width: `${percent}%`, background: 'var(--teal)' }} />
          </div>
          <span className="w-7 font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {percent}%
          </span>
        </div>
      </div>
    </div>
  )
}
