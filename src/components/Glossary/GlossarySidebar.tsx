'use client'

import { useState } from 'react'
import { Variable } from '@/lib/types'

interface GlossarySidebarProps {
  variables: Variable[]
  isOpen: boolean
  onClose: () => void
  onVariableClick?: (variable: Variable) => void
}

export default function GlossarySidebar({ variables, isOpen, onClose, onVariableClick }: GlossarySidebarProps) {
  const [search, setSearch] = useState('')

  const filtered = variables.filter(v =>
    v.symbol.toLowerCase().includes(search.toLowerCase()) ||
    v.definition.toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => (b.allOccurrences?.length ?? 0) - (a.allOccurrences?.length ?? 0))

  if (!isOpen) return null

  return (
    <div
      className="fixed right-0 top-0 h-full z-50 flex flex-col animate-slide-in-right"
      style={{
        width: '320px',
        backgroundColor: '#111827',
        borderLeft: '1px solid #1a2235',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1a2235' }}>
        <p className="text-xs font-display uppercase tracking-wider" style={{ color: '#00d4aa' }}>Glossary</p>
        <button onClick={onClose} style={{ color: '#9ca3af' }}>×</button>
      </div>

      <div className="px-3 py-2" style={{ borderBottom: '1px solid #1a2235' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search terms..."
          className="w-full px-3 py-1.5 rounded text-sm"
          style={{
            backgroundColor: '#1a2235',
            color: '#e8e0d0',
            border: '1px solid #1a2235',
            outline: 'none',
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {sorted.map((variable) => (
          <button
            key={variable.symbol}
            onClick={() => onVariableClick?.(variable)}
            className="w-full text-left p-2.5 rounded hover:bg-opacity-50 transition-all"
            style={{ backgroundColor: '#0d1117' }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-sm" style={{ color: '#00d4aa' }}>{variable.symbol}</span>
              <div className="flex items-center gap-1">
                <div
                  className="h-1 rounded-full"
                  style={{
                    width: `${Math.min(((variable.allOccurrences?.length ?? 0) / 30) * 40, 40)}px`,
                    backgroundColor: '#00d4aa',
                    opacity: 0.5,
                  }}
                />
                <span className="text-xs font-mono" style={{ color: '#9ca3af' }}>{variable.allOccurrences?.length ?? 0}×</span>
              </div>
            </div>
            <p className="text-xs" style={{ color: '#9ca3af', lineHeight: '1.4' }}>
              {variable.definition.substring(0, 80)}{variable.definition.length > 80 ? '...' : ''}
            </p>
          </button>
        ))}

        {sorted.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: '#9ca3af' }}>No variables found</p>
        )}
      </div>
    </div>
  )
}
