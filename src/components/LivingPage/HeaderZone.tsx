'use client'

import ReadingModeToggle from './ReadingModeToggle'
import { ProcessedPaper, ReadingMode } from '@/lib/types'

interface HeaderZoneProps {
  paper: ProcessedPaper
  readingMode: ReadingMode
  onReadingModeChange: (mode: ReadingMode) => void
}

export default function HeaderZone({ paper, readingMode, onReadingModeChange }: HeaderZoneProps) {
  return (
    <header className="mb-8 pb-8" style={{ borderBottom: '1px solid #1a2235' }}>
      {/* Venue + year */}
      {(paper.venue || paper.year) && (
        <div className="flex items-center gap-2 mb-2">
          {paper.venue && (
            <span
              className="text-xs px-2 py-0.5 rounded font-mono"
              style={{ backgroundColor: '#1a2235', color: '#f5a623' }}
            >
              {paper.venue}
            </span>
          )}
          {paper.year && (
            <span className="text-xs" style={{ color: '#9ca3af' }}>{paper.year}</span>
          )}
        </div>
      )}

      {/* Title */}
      <h1
        className="text-3xl md:text-4xl font-display font-bold mb-3 leading-tight"
        style={{ color: '#e8e0d0', fontFamily: 'Syne, sans-serif' }}
      >
        {paper.title}
      </h1>

      {/* Authors */}
      <p className="text-sm mb-4" style={{ color: '#9ca3af' }}>
        {paper.authors.slice(0, 5).join(', ')}
        {paper.authors.length > 5 && ` +${paper.authors.length - 5} more`}
      </p>

      {/* Relevance reason */}
      {paper.relevanceReason && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{ backgroundColor: '#111827', border: '1px solid #00d4aa22' }}
        >
          <span className="text-xs font-display uppercase tracking-wider mr-2" style={{ color: '#00d4aa' }}>
            Why this matters
          </span>
          <span style={{ color: '#e8e0d0' }}>{paper.relevanceReason}</span>
        </div>
      )}

      {/* TL;DR */}
      {paper.tldr && paper.tldr.length > 0 && (
        <div
          className="mb-6 p-4 rounded-lg"
          style={{ backgroundColor: '#111827', border: '1px solid #1a2235' }}
        >
          <p className="text-xs font-display uppercase tracking-wider mb-2" style={{ color: '#00d4aa' }}>
            TL;DR
          </p>
          <div className="space-y-1">
            {paper.tldr.map((item, i) => (
              <p
                key={i}
                className="text-sm cursor-pointer hover:underline"
                style={{ color: '#e8e0d0', fontFamily: 'IBM Plex Serif, serif' }}
                title={`Source: "${item.sourceSentenceId}"`}
              >
                {item.sentence}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Reading mode + links */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <ReadingModeToggle mode={readingMode} onChange={onReadingModeChange} />
        <div className="flex gap-2">
          <a
            href={paper.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded transition-all"
            style={{ backgroundColor: '#1a2235', color: '#9ca3af', border: '1px solid #1a2235' }}
          >
            View Paper ↗
          </a>
          {paper.pdfUrl && (
            <a
              href={paper.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded transition-all"
              style={{ backgroundColor: '#1a2235', color: '#9ca3af', border: '1px solid #1a2235' }}
            >
              PDF ↗
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
