'use client'

import { useState, useEffect } from 'react'
import { RabbitHoleItem } from '@/lib/types'

interface RabbitHolePanelProps {
  item: RabbitHoleItem
  onGoDeeper: (item: RabbitHoleItem) => void
  onClose: () => void
}

interface TermInfo {
  definition: string
  context: string
}

interface ResolvedPaper {
  title: string
  abstract?: string
  url?: string
  pdfUrl?: string
  doi?: string
  year?: number
  authors?: string[]
}

export default function RabbitHolePanel({ item, onGoDeeper, onClose }: RabbitHolePanelProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [termInfo, setTermInfo] = useState<TermInfo | null>(null)
  const [resolvedPaper, setResolvedPaper] = useState<ResolvedPaper | null>(null)

  // Resolve citation metadata when item is a paper type
  useEffect(() => {
    if (item.type !== 'paper' || !item.title) return
    let cancelled = false
    fetch(`/api/citation-lookup?title=${encodeURIComponent(item.title)}`)
      .then(r => r.json())
      .then((data: { paper?: ResolvedPaper }) => {
        if (!cancelled && data.paper) setResolvedPaper(data.paper)
      })
      .catch(() => {/* citation lookup unavailable */})
    return () => { cancelled = true }
  }, [item.type, item.title])

  const handleGoDeeper = async () => {
    setIsLoading(true)
    try {
      if (item.type === 'term' && item.term) {
        const response = await fetch('/api/prerequisite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paragraph: item.term, paperTitle: 'term lookup' }),
        })
        if (response.ok) {
          const data = await response.json()
          setTermInfo({ definition: data.concept, context: data.explanation })
        }
      }
      onGoDeeper(item)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed right-4 top-1/2 -translate-y-1/2 z-50 w-72 rounded-xl p-4 shadow-2xl animate-slide-in-right"
      style={{
        backgroundColor: '#111827',
        border: '1px solid #00d4aa33',
        boxShadow: '0 0 30px rgba(0, 212, 170, 0.1)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-xs px-2 py-0.5 rounded font-mono uppercase"
          style={{ backgroundColor: '#1a2235', color: '#9ca3af' }}
        >
          {item.type}
        </span>
        <button onClick={onClose} style={{ color: '#9ca3af' }}>×</button>
      </div>

      <h3 className="font-display text-base mb-2" style={{ color: '#e8e0d0', fontFamily: 'Syne, sans-serif' }}>
        {item.title}
      </h3>

      {/* Resolved paper metadata */}
      {resolvedPaper && (
        <div className="mb-3 space-y-1.5">
          {resolvedPaper.abstract && (
            <p className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>
              {resolvedPaper.abstract.substring(0, 200)}{resolvedPaper.abstract.length > 200 ? '…' : ''}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {resolvedPaper.year && (
              <span className="text-xs" style={{ color: '#6b7280' }}>{resolvedPaper.year}</span>
            )}
            {resolvedPaper.url && (
              <a
                href={resolvedPaper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline"
                style={{ color: '#00d4aa' }}
              >
                View ↗
              </a>
            )}
            {resolvedPaper.pdfUrl && resolvedPaper.pdfUrl !== resolvedPaper.url && (
              <a
                href={resolvedPaper.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline"
                style={{ color: '#00d4aa' }}
              >
                PDF ↗
              </a>
            )}
          </div>
        </div>
      )}

      {termInfo && (
        <p className="text-xs mb-3" style={{ color: '#9ca3af' }}>
          {termInfo.context}
        </p>
      )}

      <button
        onClick={handleGoDeeper}
        disabled={isLoading}
        className="w-full py-2 rounded text-sm font-display transition-all"
        style={{
          backgroundColor: '#00d4aa',
          color: '#0a0e14',
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading ? 'Loading...' : 'Go deeper →'}
      </button>
    </div>
  )
}
