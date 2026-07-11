'use client'

import { useEffect, useState, useRef } from 'react'

interface TermEntry {
  term: string
  definition: string
  /** Section where the term was first encountered */
  section: string
}

interface SpacedReExposureStripProps {
  /** Terms encountered during reading that have not been revisited recently */
  terms: TermEntry[]
}

/**
 * A slim ambient strip fixed to the viewport bottom that surfaces terms
 * the reader encountered earlier but hasn't actively engaged with.
 * Rotates through terms every few seconds to provide gentle re-exposure.
 */
export default function SpacedReExposureStrip({ terms }: SpacedReExposureStripProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Only show when there are terms and after a short delay
  useEffect(() => {
    if (terms.length === 0) {
      setVisible(false)
      return
    }

    const showTimer = setTimeout(() => setVisible(true), 5000)
    return () => clearTimeout(showTimer)
  }, [terms.length])

  // Rotate through terms
  useEffect(() => {
    if (!visible || terms.length <= 1) return

    intervalRef.current = setInterval(() => {
      setExpanded(false)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % terms.length)
      }, 300)
    }, 8000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [visible, terms.length])

  if (!visible || terms.length === 0) return null

  const current = terms[currentIndex]
  if (!current) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 transition-all duration-500"
      style={{ paddingRight: '72px' /* clear DepthMeter */ }}
    >
      <div
        className="mx-auto max-w-3xl px-4 py-0.5"
        style={{ backgroundColor: '#0a0e14', borderTop: '1px solid #1a2235' }}
      >
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full flex items-center gap-2 py-1.5 text-left"
          aria-label="Toggle spaced re-exposure strip"
        >
          <span
            className="text-[10px] uppercase tracking-widest shrink-0"
            style={{ color: '#6b7280', fontFamily: 'Syne, sans-serif' }}
          >
            Recall
          </span>
          <span
            className="text-xs font-mono"
            style={{ color: '#00d4aa' }}
          >
            {current.term}
          </span>
          <span
            className="text-xs truncate flex-1"
            style={{ color: '#9ca3af', fontFamily: 'IBM Plex Serif, serif' }}
          >
            {expanded ? current.definition : `— ${current.definition.slice(0, 60)}${current.definition.length > 60 ? '…' : ''}`}
          </span>
          {terms.length > 1 && (
            <span className="shrink-0 text-[10px]" style={{ color: '#6b7280' }}>
              {currentIndex + 1}/{terms.length}
            </span>
          )}
        </button>

        {expanded && (
          <div
            className="pb-2 text-xs"
            style={{ color: '#9ca3af', fontFamily: 'IBM Plex Serif, serif' }}
          >
            <span style={{ color: '#6b7280' }}>First seen in </span>
            <em>{current.section}</em>
            <span> — </span>
            {current.definition}
          </div>
        )}
      </div>
    </div>
  )
}
