'use client'

import { useState } from 'react'
import { Variable } from '@/lib/types'

interface VariableHoverCardProps {
  symbol: string
  variable?: Variable
  children?: React.ReactNode
  onHover?: () => void
}

export default function VariableHoverCard({ symbol, variable, children, onHover }: VariableHoverCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!variable) {
    return <span className="variable-highlight">{children || symbol}</span>
  }

  return (
    <span className="relative inline-block">
      <span
        className="variable-highlight cursor-pointer"
        style={{ color: '#00d4aa', borderBottom: '1px dashed #00d4aa', fontFamily: 'JetBrains Mono, monospace' }}
        onMouseEnter={() => { setIsOpen(true); onHover?.() }}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
      >
        {children || symbol}
      </span>
      {isOpen && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 rounded-lg shadow-xl text-sm min-w-[200px] max-w-[300px]"
          style={{ backgroundColor: '#111827', border: '1px solid #00d4aa', color: '#e8e0d0' }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-lg" style={{ color: '#00d4aa' }}>{variable.symbol}</span>
            {variable.units && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#1a2235', color: '#9ca3af' }}>
                {variable.units}
              </span>
            )}
          </div>
          <p style={{ color: '#e8e0d0' }} className="mb-1">{variable.definition}</p>
          <p className="text-xs" style={{ color: '#9ca3af' }}>{variable.name}</p>
          <div className="mt-2 pt-2 flex items-center gap-2" style={{ borderTop: '1px solid #1a2235' }}>
            <span className="text-xs" style={{ color: '#9ca3af' }}>used</span>
            <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: '#1a2235' }}>
              <div
                className="h-1 rounded-full"
                style={{ backgroundColor: '#00d4aa', width: `${Math.min(((variable.allOccurrences?.length ?? 0) / 30) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs font-mono" style={{ color: '#00d4aa' }}>{variable.allOccurrences?.length ?? 0}×</span>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45" style={{ backgroundColor: '#111827', borderRight: '1px solid #00d4aa', borderBottom: '1px solid #00d4aa' }} />
        </div>
      )}
    </span>
  )
}
