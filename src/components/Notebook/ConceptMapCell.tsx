'use client'

import { NotebookCell as NotebookCellType, Variable } from '@/lib/types'
import InlineMatplotlibEmbed from './InlineMatplotlibEmbed'

interface ConceptMapCellProps {
  cell: NotebookCellType
  variables?: Variable[]
  onOpenInNotebook?: (cellId: string) => void
}

/**
 * A special notebook cell that renders a networkx/matplotlib concept map.
 * Delegates rendering to InlineMatplotlibEmbed so the chart appears inline in the paper.
 */
export default function ConceptMapCell({ cell, onOpenInNotebook }: ConceptMapCellProps) {
  return (
    <div className="my-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-display uppercase tracking-wider text-teal">🗺 Concept Map</span>
      </div>
      <InlineMatplotlibEmbed cell={cell} onOpenInNotebook={onOpenInNotebook} />
    </div>
  )
}
