'use client'

import { useState } from 'react'
import { EvidenceChain as EvidenceChainType } from '@/lib/types'

interface EvidenceChainProps {
  chain: EvidenceChainType
}

export default function EvidenceChain({ chain }: EvidenceChainProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const steps = [
    { label: 'Claim', content: chain.claim, color: '#00d4aa' },
    { label: 'Experiment', content: chain.experiment, color: '#9ca3af' },
    ...(chain.figureId ? [{ label: 'Figure', content: chain.figureId, color: '#f5a623' }] : []),
    { label: 'Result', content: chain.statisticalResult, color: '#e8e0d0' },
    { label: 'Conclusion', content: chain.conclusion, color: '#00d4aa' },
  ]

  return (
    <div className="my-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full transition-all"
        style={{
          backgroundColor: '#111827',
          border: '1px solid #1a2235',
          color: '#9ca3af',
        }}
      >
        <span>⛓</span>
        <span>Evidence chain</span>
        <span className="ml-1">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2 animate-fade-in">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: step.color }} />
                {i < steps.length - 1 && (
                  <div className="w-0.5 flex-1 my-1" style={{ backgroundColor: '#1a2235' }} />
                )}
              </div>
              <div className="pb-2">
                <span className="text-xs font-display uppercase tracking-wider" style={{ color: step.color }}>
                  {step.label}
                </span>
                <p className="text-sm mt-0.5" style={{ color: '#e8e0d0' }}>{step.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
