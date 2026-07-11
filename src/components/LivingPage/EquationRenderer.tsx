'use client'

import { useEffect, useRef, useState } from 'react'
import { useEquationReveal } from '@/hooks/useEquationReveal'
import { Equation } from '@/lib/types'

interface EquationRendererProps {
  equation: Equation
  onExpand?: () => void
}

declare global {
  interface Window {
    MathJax?: {
      typeset?: (elements?: HTMLElement[]) => void
      tex?: object
    }
  }
}

export default function EquationRenderer({ equation, onExpand }: EquationRendererProps) {
  const { ref, isFocused, focusNow } = useEquationReveal()
  const [isExpanded, setIsExpanded] = useState(false)
  const [derivationStep, setDerivationStep] = useState(0)
  const mathRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (mathRef.current && window.MathJax?.typeset) {
      window.MathJax.typeset([mathRef.current])
    }
  }, [equation.latex])

  const handleExpand = () => {
    setIsExpanded(!isExpanded)
    focusNow()
    onExpand?.()
  }

  return (
    <div
      ref={ref}
      className="my-6 group cursor-pointer"
      onClick={handleExpand}
    >
      <div
        className="p-4 rounded-lg transition-all duration-300"
        style={{
          backgroundColor: '#111827',
          border: `1px solid ${isFocused ? '#00d4aa33' : '#1a2235'}`,
          boxShadow: isFocused ? '0 0 20px rgba(0, 212, 170, 0.1)' : 'none',
        }}
      >
        <div
          ref={mathRef}
          className="text-center text-lg overflow-x-auto"
          style={{ color: '#e8e0d0', fontFamily: 'JetBrains Mono, monospace' }}
        >
          {`\\[${equation.latex}\\]`}
        </div>

        {isFocused && equation.label && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid #1a2235' }}>
            <p className="text-sm" style={{ color: '#9ca3af' }}>{equation.label}</p>
          </div>
        )}
      </div>

      {isExpanded && equation.storySteps && equation.storySteps.length > 0 && (
        <div className="mt-3 p-4 rounded-lg" style={{ backgroundColor: '#0a0e14', border: '1px solid #1a2235' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-display uppercase tracking-wider" style={{ color: '#00d4aa' }}>
              Equation Story
            </span>
            <div className="flex gap-1">
              {equation.storySteps.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setDerivationStep(i) }}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{ backgroundColor: i === derivationStep ? '#00d4aa' : '#1a2235' }}
                />
              ))}
            </div>
          </div>
          <p className="text-sm" style={{ color: '#e8e0d0' }}>
            {equation.storySteps[derivationStep]}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={(e) => { e.stopPropagation(); setDerivationStep(s => Math.max(0, s - 1)) }}
              className="px-2 py-1 text-xs rounded"
              style={{ backgroundColor: '#1a2235', color: '#9ca3af' }}
              disabled={derivationStep === 0}
            >
              ← Prev
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDerivationStep(s => Math.min((equation.storySteps?.length || 1) - 1, s + 1)) }}
              className="px-2 py-1 text-xs rounded"
              style={{ backgroundColor: '#1a2235', color: '#9ca3af' }}
              disabled={derivationStep === (equation.storySteps?.length || 1) - 1}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
