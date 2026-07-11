'use client'

import { useState } from 'react'
import { Variable } from '@/lib/types'

interface VariableHoverCardProps {
  symbol: string
  variable?: Variable
  children?: React.ReactNode
  onHover?: () => void
  seenBefore?: boolean
}

export default function VariableHoverCard({
  symbol,
  variable,
  children,
  onHover,
  seenBefore,
}: VariableHoverCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!variable) {
    return <span className="variable-highlight">{children || symbol}</span>
  }

  return (
    <span className="relative inline-block" onMouseLeave={() => setIsOpen(false)}>
      <button
        type="button"
        className="variable-highlight cursor-help font-mono"
        style={{
          color: 'var(--teal)',
          borderBottom: seenBefore ? '2px solid var(--amber)' : '1px dashed var(--teal)',
        }}
        title={seenBefore ? 'Seen in an earlier paper this session' : undefined}
        aria-expanded={isOpen}
        onMouseEnter={() => {
          setIsOpen(true)
          onHover?.()
        }}
        onFocus={() => {
          setIsOpen(true)
          onHover?.()
        }}
        onBlur={() => setIsOpen(false)}
        onClick={() => setIsOpen((value) => !value)}
      >
        {children || symbol}
      </button>
      {isOpen && (
        <div
          className="absolute bottom-full left-1/2 z-50 mb-2 min-w-[220px] max-w-[300px] -translate-x-1/2 rounded-lg border p-3 text-sm shadow-xl"
          style={{ background: 'var(--surface)', borderColor: 'var(--teal)', color: 'var(--text)' }}
          role="tooltip"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-lg" style={{ color: '#00d4aa' }}>
              {variable.symbol}
            </span>
            {variable.units && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ backgroundColor: '#1a2235', color: '#9ca3af' }}
              >
                {variable.units}
              </span>
            )}
          </div>
          {seenBefore && (
            <p className="text-[10px] mb-1 uppercase tracking-wide" style={{ color: '#f5a623' }}>
              Seen before in this session
            </p>
          )}
          <p style={{ color: '#e8e0d0' }} className="mb-1">
            {variable.definition}
          </p>
          <p className="text-xs" style={{ color: '#9ca3af' }}>
            {variable.name}
          </p>
          <div className="mt-2 pt-2 flex items-center gap-2" style={{ borderTop: '1px solid #1a2235' }}>
            <span className="text-xs" style={{ color: '#9ca3af' }}>
              used
            </span>
            <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: '#1a2235' }}>
              <div
                className="h-1 rounded-full"
                style={{
                  backgroundColor: '#00d4aa',
                  width: `${Math.min(((variable.allOccurrences?.length ?? 0) / 30) * 100, 100)}%`,
                }}
              />
            </div>
            <span className="text-xs font-mono" style={{ color: '#00d4aa' }}>
              {variable.allOccurrences?.length ?? 0}×
            </span>
          </div>
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45"
            style={{
              backgroundColor: '#111827',
              borderRight: '1px solid #00d4aa',
              borderBottom: '1px solid #00d4aa',
            }}
          />
        </div>
      )}
    </span>
  )
}
