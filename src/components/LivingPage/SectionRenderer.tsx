'use client'

import { useState } from 'react'
import { Section, Variable, Equation, ReadingMode, EvidenceChain as EvidenceChainType, Figure, NotebookCell as NotebookCellType } from '@/lib/types'
import EquationRenderer from './EquationRenderer'
import FigureViewer from './FigureViewer'
import DontUnderstandButton from './DontUnderstandButton'
import VariableHoverCard from './VariableHoverCard'
import EvidenceChain from './EvidenceChain'
import ProgressiveReveal from './ProgressiveReveal'
import FollowThatCheckpoint from './FollowThatCheckpoint'
import NotationWarningBadge from './NotationWarning'
import InlineDemoSection from '@/components/Notebook/InlineDemoSection'
import { NotationWarning as NotationWarningType } from '@/lib/types'

interface SectionRendererProps {
  section: Section
  variables: Variable[]
  equations?: Equation[]
  figures?: Figure[]
  paperTitle: string
  readingMode: ReadingMode
  onEquationExpand?: () => void
  onVariableHover?: () => void
  evidenceChains?: EvidenceChainType[]
  notebookCells?: NotebookCellType[]
  onOpenNotebook?: () => void
  notationWarnings?: NotationWarningType[]
  showCheckpoint?: boolean
  checkpointPrompt?: string
  onCheckpoint?: (response: string) => void
  seenBeforeSymbols?: Set<string>
  learnerUserId?: string
  learnerEmail?: string
  paperId?: string
}

function highlightVariables(
  text: string,
  variables: Variable[],
  onHover?: () => void,
  seenBeforeSymbols?: Set<string>
): React.ReactNode[] {
  if (!variables.length) return [text]

  const varMap = new Map(variables.map(v => [v.symbol, v]))
  const sortedSymbols = Array.from(varMap.keys()).sort((a, b) => b.length - a.length)

  const escapedSymbols = sortedSymbols.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const patterns = escapedSymbols.map(s => {
    if (s.length === 1) {
      return `(?<![a-zA-Z0-9_])${s}(?![a-zA-Z0-9_])`
    }
    return `\\b${s}\\b`
  })
  const combinedRegex = new RegExp(`(${patterns.join('|')})`, 'g')

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let keyIndex = 0

  while ((match = combinedRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }
    const matchedSymbol = match[0]
    const variable = varMap.get(matchedSymbol)
    if (variable) {
      const seen = seenBeforeSymbols?.has(matchedSymbol)
      parts.push(
        <VariableHoverCard
          key={`var-${keyIndex++}`}
          symbol={matchedSymbol}
          variable={variable}
          onHover={onHover}
          seenBefore={seen}
        >
          {matchedSymbol}
        </VariableHoverCard>
      )
    } else {
      parts.push(matchedSymbol)
    }
    lastIndex = combinedRegex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

export default function SectionRenderer({
  section,
  variables,
  equations = [],
  figures = [],
  paperTitle,
  readingMode,
  onEquationExpand,
  onVariableHover,
  evidenceChains = [],
  notebookCells = [],
  onOpenNotebook,
  notationWarnings = [],
  showCheckpoint = false,
  checkpointPrompt,
  onCheckpoint,
  seenBeforeSymbols,
  learnerUserId,
  learnerEmail,
  paperId,
}: SectionRendererProps) {
  const [activeParagraph, setActiveParagraph] = useState<number | null>(null)
  const sectionWarnings = notationWarnings.filter(
    (w) => w.sectionA === section.id || w.sectionB === section.id || w.sectionA === section.title || w.sectionB === section.title
  )

  return (
    <section id={section.id} className="mb-12">
      <ProgressiveReveal>
        <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
          <h2 className="text-2xl font-display text-text" style={{ fontFamily: 'Syne, sans-serif' }}>
            {section.title}
          </h2>
          {sectionWarnings.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {sectionWarnings.map((w) => (
                <NotationWarningBadge
                  key={`${w.symbol}-${w.sectionA}-${w.sectionB}`}
                  symbol={w.symbol}
                  sectionA={w.sectionA}
                  meaningA={w.meaningA}
                  sectionB={w.sectionB}
                  meaningB={w.meaningB}
                />
              ))}
            </div>
          )}
        </div>
      </ProgressiveReveal>

      {section.content.map((block, i) => (
        <ProgressiveReveal key={block.id} delay={200 + i * 80}>
          {block.type === 'paragraph' && (
            <div
              className="relative group mb-4"
              onMouseEnter={() => setActiveParagraph(i)}
              onMouseLeave={() => setActiveParagraph(null)}
            >
              <p
                id={block.id}
                className="text-base leading-relaxed text-text font-serif"
                style={{ lineHeight: '1.85' }}
              >
                {highlightVariables(block.raw, variables, onVariableHover, seenBeforeSymbols)}
              </p>
              <div className={`mt-1 transition-opacity duration-200 ${activeParagraph === i ? 'opacity-100' : 'opacity-0'}`}>
                <DontUnderstandButton
                  paragraph={block.raw}
                  paperTitle={paperTitle}
                  userId={learnerUserId}
                  email={learnerEmail}
                  paperId={paperId}
                />
              </div>
            </div>
          )}
          {block.type === 'equation' && readingMode !== 'skim' && (() => {
            const equation = equations.find(eq => eq.blockId === block.id)
            if (equation) {
              return <EquationRenderer equation={equation} onExpand={onEquationExpand} />
            }
            return (
              <div
                id={block.id}
                className="equation-container p-4 rounded my-4 overflow-x-auto bg-background border border-surface-2"
              >
                <span dangerouslySetInnerHTML={{ __html: `\\[${block.raw}\\]` }} />
              </div>
            )
          })()}
          {block.type === 'figure' && (() => {
            const figure = figures.find((f) => f.id === block.id || block.raw.includes(f.label))
            if (figure) {
              return <FigureViewer figure={figure} />
            }
            return (
              <div id={block.id} className="my-4 rounded border border-surface-2 p-4 flex items-center gap-3">
                <span className="text-3xl">📊</span>
                <p className="text-sm italic text-text-muted font-serif">{block.raw}</p>
              </div>
            )
          })()}
        </ProgressiveReveal>
      ))}

      {evidenceChains.length > 0 && readingMode === 'deep-dive' && (
        <ProgressiveReveal delay={400}>
          {evidenceChains.map((chain, i) => (
            <EvidenceChain key={i} chain={chain} />
          ))}
        </ProgressiveReveal>
      )}

      {notebookCells.length > 0 && (
        <ProgressiveReveal delay={500}>
          <InlineDemoSection
            cells={notebookCells}
            sectionId={section.id}
            onOpenInNotebook={onOpenNotebook}
          />
        </ProgressiveReveal>
      )}

      {showCheckpoint && (
        <FollowThatCheckpoint
          prompt={
            checkpointPrompt ||
            `In your own words, what is the key idea of “${section.title}”?`
          }
          onResponse={onCheckpoint}
        />
      )}
    </section>
  )
}
