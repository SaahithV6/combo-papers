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
    <div className="space-y-3">
      {papers.map((paper) => {
        const isSelected = selectedIds.includes(paper.id ?? '')
        const status = processingStatus[paper.id ?? '']

        return (
          <div
            key={paper.id ?? `${paper.title}-${paper.sourceUrl}`}
            onClick={() => onSelectPaper(paper)}
            className="p-4 rounded-xl cursor-pointer transition-all"
            style={{
              backgroundColor: '#111827',
              border: `1px solid ${isSelected ? '#00d4aa33' : '#1a2235'}`,
              boxShadow: isSelected ? '0 0 10px rgba(0, 212, 170, 0.1)' : 'none',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {paper.venue && (
                    <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: '#1a2235', color: '#f5a623' }}>
                      {paper.venue}
                    </span>
                  )}
                  {paper.year && (
                    <span className="text-xs" style={{ color: '#9ca3af' }}>{paper.year}</span>
                  )}
                  {paper.relevanceScore && (
                    <span className="text-xs font-mono" style={{ color: '#00d4aa' }}>
                      {Math.round(paper.relevanceScore * 100)}% match
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-medium mb-1 leading-snug" style={{ color: '#e8e0d0' }}>
                  {paper.title}
                </h3>

                <p className="text-xs" style={{ color: '#9ca3af' }}>
                  {paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ' et al.' : ''}
                </p>

                <p className="text-xs mt-1.5 line-clamp-2" style={{ color: '#9ca3af', fontFamily: 'IBM Plex Serif, serif' }}>
                  {(paper.abstract ?? '').substring(0, 150)}...
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                {status && (
                  <span
                    className="text-xs px-2 py-0.5 rounded font-mono whitespace-nowrap"
                    style={{
                      backgroundColor: status === 'complete' ? '#00d4aa1a' : '#1a2235',
                      color: status === 'complete' ? '#00d4aa' : '#9ca3af',
                    }}
                  >
                    {status === 'complete' ? '✓ Ready' : status}
                  </span>
                )}
                {isSelected && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00d4aa' }}>
                    <span className="text-xs text-background" style={{ color: '#0a0e14' }}>✓</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
