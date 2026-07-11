'use client'

import { useState, useCallback } from 'react'

export type InteractionType = 'hoveredVariable' | 'expandedEquation' | 'ranNotebookCell' | 'clickedCitation'

interface DepthState {
  [paperId: string]: {
    interactions: Partial<Record<InteractionType, number>>
    depth: number
  }
}

const INTERACTION_WEIGHTS: Record<InteractionType, number> = {
  hoveredVariable: 0.05,
  expandedEquation: 0.1,
  ranNotebookCell: 0.2,
  clickedCitation: 0.1,
}

function calculateDepth(interactions: Partial<Record<InteractionType, number>>): number {
  let total = 0
  for (const [key, count] of Object.entries(interactions)) {
    const weight = INTERACTION_WEIGHTS[key as InteractionType] || 0
    total += weight * Math.min(count as number, 3)
  }
  return Math.min(total, 1.0)
}

export function useDepthMeter(paperId?: string) {
  const [state, setState] = useState<DepthState>({})
  const DEFAULT_PAPER_ID = '__default__'
  const currentPaperId = paperId || DEFAULT_PAPER_ID

  const recordInteraction = useCallback((type: InteractionType, id?: string) => {
    setState(prev => {
      const paperState = prev[currentPaperId] || { interactions: {}, depth: 0 }
      const updated = {
        ...paperState.interactions,
        [type]: (paperState.interactions[type] || 0) + 1,
      }
      const depth = calculateDepth(updated)
      return {
        ...prev,
        [currentPaperId]: { interactions: updated, depth },
      }
    })
  }, [currentPaperId])

  // Legacy compat
  const recordAction = useCallback((type: string) => {
    recordInteraction(type as InteractionType)
  }, [recordInteraction])

  const currentState = state[currentPaperId] || { interactions: {}, depth: 0 }
  const depth = currentState.depth

  const getDepthPercentage = useCallback(() => {
    return Math.round(currentState.depth * 100)
  }, [currentState.depth])

  return { depth, recordAction, recordInteraction, getDepthPercentage }
}
