'use client'

import ReadingModeToggle from './ReadingModeToggle'
import { ProcessedPaper, ReadingMode } from '@/lib/types'

interface HeaderZoneProps {
  paper: ProcessedPaper
  readingMode: ReadingMode
  onReadingModeChange: (mode: ReadingMode) => void
}

export default function HeaderZone({
  paper,
  readingMode,
  onReadingModeChange,
}: HeaderZoneProps) {
  const jumpToSource = (sourceSentenceId: string) => {
    const el = document.getElementById(sourceSentenceId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-teal-400')
      setTimeout(() => el.classList.remove('ring-2', 'ring-teal-400'), 1600)
    }
  }

  return (
    <header className="mb-8 border-b pb-8" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {paper.venue && (
          <span className="ui-chip" style={{ color: 'var(--amber)', borderColor: 'rgba(233, 173, 87, 0.35)' }}>
            {paper.venue}
          </span>
        )}
        {paper.year && <span className="ui-chip">{paper.year}</span>}
      </div>

      <h1 className="font-display text-3xl font-semibold leading-tight tracking-[-0.03em] md:text-4xl">
        {paper.title}
      </h1>

      <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
        {paper.authors.slice(0, 5).join(', ')}
        {paper.authors.length > 5 && ` +${paper.authors.length - 5} more`}
      </p>

      {paper.relevanceReason && (
        <div
          className="mt-5 rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: 'rgba(79, 209, 181, 0.25)', background: 'var(--teal-soft)' }}
        >
          <span className="ui-label mr-2" style={{ color: 'var(--teal)' }}>
            Why this matters
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>{paper.relevanceReason}</span>
        </div>
      )}

      {paper.tldr && paper.tldr.length > 0 && (
        <div className="ui-panel mt-5 p-4">
          <p className="ui-label mb-3" style={{ color: 'var(--teal)' }}>
            TL;DR · click to jump to source
          </p>
          <div className="space-y-2">
            {paper.tldr.map((item, i) => (
              <button
                key={i}
                type="button"
                className="block w-full rounded-lg px-2 py-1.5 text-left text-sm leading-relaxed transition-colors hover:bg-white/[0.03]"
                style={{ color: 'var(--text-secondary)' }}
                title={`Jump to ${item.sourceSentenceId}`}
                onClick={() => jumpToSource(item.sourceSentenceId)}
              >
                {item.sentence}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <ReadingModeToggle mode={readingMode} onChange={onReadingModeChange} />
        <div className="flex gap-2">
          <a href={paper.sourceUrl} target="_blank" rel="noopener noreferrer" className="ui-button">
            Source ↗
          </a>
          {paper.pdfUrl && (
            <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer" className="ui-button">
              PDF ↗
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
