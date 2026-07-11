'use client'

import { useMemo, useState } from 'react'
import type { ApproachConflict, ConflictAnalysis } from '@/lib/agent/conflicts'

interface Props {
  analysis: ConflictAnalysis
  onChooseApproach?: (paperId: string | undefined, side: 'A' | 'B', conflict: ApproachConflict) => void
}

export default function ConflictProsCons({ analysis, onChooseApproach }: Props) {
  const [expanded, setExpanded] = useState<string | null>(analysis.conflicts[0]?.id || null)

  const conflicts = useMemo(() => analysis.conflicts || [], [analysis.conflicts])

  if (conflicts.length === 0 && !analysis.summary) return null

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ backgroundColor: '#111827', border: '1px solid #f5a62333' }}
    >
      <div>
        <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#f5a623' }}>
          Approach conflicts · choose deliberately
        </p>
        <p
          className="text-sm leading-relaxed"
          style={{ color: '#e8e0d0', fontFamily: 'IBM Plex Serif, serif' }}
        >
          {analysis.summary}
        </p>
        {analysis.recommendedStartingPoint && (
          <p className="text-xs mt-2" style={{ color: '#00d4aa' }}>
            Suggested start: {analysis.recommendedStartingPoint}
          </p>
        )}
      </div>

      {analysis.agreements?.length > 0 && (
        <div className="text-xs" style={{ color: '#9ca3af' }}>
          <span style={{ color: '#e8e0d0' }}>Agreements: </span>
          {analysis.agreements.join(' · ')}
        </div>
      )}

      <div className="space-y-3">
        {conflicts.map((c) => {
          const open = expanded === c.id
          return (
            <div
              key={c.id}
              className="rounded-lg overflow-hidden"
              style={{ border: '1px solid #1a2235' }}
            >
              <button
                type="button"
                onClick={() => setExpanded(open ? null : c.id)}
                className="w-full text-left px-4 py-3 flex items-start justify-between gap-3"
                style={{ backgroundColor: '#0a0e14' }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: '#e8e0d0' }}>
                    {c.topic}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                    {c.whyItMatters}
                  </p>
                </div>
                <span className="text-xs shrink-0" style={{ color: '#f5a623' }}>
                  {Math.round((c.confidence || 0) * 100)}% · {open ? '−' : '+'}
                </span>
              </button>

              {open && (
                <div className="grid md:grid-cols-2 gap-0 border-t" style={{ borderColor: '#1a2235' }}>
                  {(['A', 'B'] as const).map((side) => {
                    const paper = side === 'A' ? c.paperA : c.paperB
                    const pros = side === 'A' ? c.prosA : c.prosB
                    const cons = side === 'A' ? c.consA : c.consB
                    const when = side === 'A' ? c.whenToChooseA : c.whenToChooseB
                    return (
                      <div
                        key={side}
                        className="p-4"
                        style={{
                          borderRight: side === 'A' ? '1px solid #1a2235' : undefined,
                          backgroundColor: '#111827',
                        }}
                      >
                        <p className="text-xs mb-1" style={{ color: '#00d4aa' }}>
                          Approach {side}
                        </p>
                        <p className="text-sm font-medium mb-2" style={{ color: '#e8e0d0' }}>
                          {paper.title}
                        </p>
                        <p className="text-xs mb-3" style={{ color: '#9ca3af' }}>
                          {paper.stance}
                        </p>
                        <p className="text-xs mb-1" style={{ color: '#00d4aa' }}>
                          Pros
                        </p>
                        <ul className="text-xs mb-3 space-y-1" style={{ color: '#9ca3af' }}>
                          {pros.map((p) => (
                            <li key={p}>+ {p}</li>
                          ))}
                        </ul>
                        <p className="text-xs mb-1" style={{ color: '#f5a623' }}>
                          Cons
                        </p>
                        <ul className="text-xs mb-3 space-y-1" style={{ color: '#9ca3af' }}>
                          {cons.map((p) => (
                            <li key={p}>− {p}</li>
                          ))}
                        </ul>
                        <p className="text-xs mb-3" style={{ color: '#e8e0d0' }}>
                          Choose when: {when}
                        </p>
                        <button
                          type="button"
                          onClick={() => onChooseApproach?.(paper.id, side, c)}
                          className="text-xs px-3 py-1.5 rounded"
                          style={{ backgroundColor: '#00d4aa', color: '#0a0e14' }}
                        >
                          Work with Approach {side} →
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
