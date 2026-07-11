'use client'

import { useState } from 'react'
import { NotebookCell as NotebookCellType } from '@/lib/types'
import NotebookCell from './NotebookCell'

interface InlineDemoSectionProps {
  cells: NotebookCellType[]
  sectionId: string
  onOpenInNotebook?: () => void
}

/**
 * Collapsible "📓 Interactive Demo" block rendered inline within a paper section.
 * Shows all notebook cells (markdown + code) associated with a section.
 * Includes an "Also in notebook →" badge to open the side panel.
 */
export default function InlineDemoSection({ cells, sectionId, onOpenInNotebook }: InlineDemoSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (cells.length === 0) return null

  return (
    <div
      id={`inline-demo-${sectionId}`}
      className="my-6 rounded border border-teal/20 bg-surface overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-2 hover:bg-surface-3 transition-colors text-left"
      >
        <span className="text-sm font-display text-teal flex items-center gap-2">
          📓 Interactive Demo
          <span className="text-xs text-text-muted font-serif font-normal">
            ({cells.length} cell{cells.length !== 1 ? 's' : ''})
          </span>
        </span>
        <div className="flex items-center gap-3">
          {onOpenInNotebook && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onOpenInNotebook() }}
              className="text-xs text-teal hover:underline"
            >
              Also in notebook →
            </span>
          )}
          <span className="text-xs text-text-muted">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Cells */}
      {isExpanded && (
        <div>
          {cells.map(cell => (
            <NotebookCell key={cell.id} cell={cell} />
          ))}
        </div>
      )}
    </div>
  )
}
