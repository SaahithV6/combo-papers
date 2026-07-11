'use client'

import { PaperMetadata } from '@/lib/types'

interface PaperListProps {
  papers: PaperMetadata[]
  onSelectPaper: (paper: PaperMetadata) => void
  selectedIds?: string[]
  processingStatus?: Record<string, string>
}

export default function PaperList({ papers, onSelectPaper, selectedIds = [], processingStatus = {} }: PaperListProps) {
  return (
    <div className="space-y-2">
      {papers.map((paper) => {
        const isSelected = selectedIds.includes(paper.id ?? '')
        const status = processingStatus[paper.id ?? '']
        const abstract = paper.abstract?.trim()

        return (
          <button
            type="button"
            key={paper.id ?? `${paper.title}-${paper.sourceUrl}`}
            onClick={() => onSelectPaper(paper)}
            aria-pressed={isSelected}
            className="group w-full rounded-xl border p-4 text-left transition-all"
            style={{
              background: isSelected ? 'var(--teal-soft)' : 'var(--surface)',
              borderColor: isSelected ? 'rgba(79, 209, 181, 0.34)' : 'var(--border-subtle)',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {paper.venue && (
                    <span className="ui-chip" style={{ color: 'var(--amber)' }}>
                      {paper.venue}
                    </span>
                  )}
                  {paper.year && (
                    <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {paper.year}
                    </span>
                  )}
                  {typeof paper.relevanceScore === 'number' && paper.relevanceScore > 0 && (
                    <span className="font-mono text-[10px]" style={{ color: 'var(--teal)' }}>
                      {Math.round(
                        paper.relevanceScore <= 1
                          ? paper.relevanceScore * 100
                          : paper.relevanceScore
                      )}% match
                    </span>
                  )}
                </div>

                <h3 className="mb-1 font-display text-sm font-semibold leading-snug md:text-[15px]">
                  {paper.title}
                </h3>

                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ' et al.' : ''}
                </p>

                {paper.relevanceReason ? (
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--teal)' }}>
                    {paper.relevanceReason}
                  </p>
                ) : abstract ? (
                  <p
                    className="mt-2 line-clamp-2 text-xs leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {abstract.length > 190 ? `${abstract.slice(0, 190)}…` : abstract}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col items-end gap-2">
                {status && (
                  <span
                    className="ui-chip whitespace-nowrap"
                    style={{
                      color: status === 'complete' ? 'var(--teal)' : 'var(--text-muted)',
                    }}
                  >
                    {status === 'complete' ? '✓ Ready' : status}
                  </span>
                )}
                <span
                  className="grid h-6 w-6 place-items-center rounded-full border font-mono text-xs"
                  style={{
                    color: isSelected ? '#07110e' : 'var(--text-muted)',
                    borderColor: isSelected ? 'var(--teal)' : 'var(--border)',
                    background: isSelected ? 'var(--teal)' : 'transparent',
                  }}
                  aria-hidden="true"
                >
                  {isSelected ? '✓' : '+'}
                </span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
