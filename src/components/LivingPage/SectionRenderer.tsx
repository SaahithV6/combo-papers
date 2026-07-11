'use client'

import { useState } from 'react'
import { Section, Variable, Equation, ReadingMode, EvidenceChain as EvidenceChainType, Figure, NotebookCell as NotebookCellType } from '@/lib/types'
import EquationRenderer from './EquationRenderer'
import FigureViewer from './FigureViewer'
import DontUnderstandButton from './DontUnderstandButton'
import VariableHoverCard from './VariableHoverCard'
import EvidenceChain from './EvidenceChain'
import ProgressiveReveal from './ProgressiveReveal'
import InlineDemoSection from '@/components/Notebook/InlineDemoSection'

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
}

function highlightVariables(text: string, variables: Variable[], onHover?: () => void): React.ReactNode[] {
  if (!variables.length) return [text]

  const varMap = new Map(variables.map(v => [v.symbol, v]))
  // Sort by length descending so longer symbols match first
  const sortedSymbols = Array.from(varMap.keys()).sort((a, b) => b.length - a.length)

  // Build a single regex that matches any variable symbol at word boundaries
  const escapedSymbols = sortedSymbols.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  // For single chars, require non-alphanumeric neighbors; for multi-char, use word boundaries
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
      parts.push(
        <VariableHoverCard key={`var-${keyIndex++}`} symbol={matchedSymbol} variable={variable} onHover={onHover}>
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
}: SectionRendererProps) {
  const [activeParagraph, setActiveParagraph] = useState<number | null>(null)

  return (
    <section id={section.id} className="mb-12">
      <ProgressiveReveal>
        <h2 className="text-2xl font-display mb-2 text-text" style={{ fontFamily: 'Syne, sans-serif' }}>
          {section.title}
        </h2>
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
                {highlightVariables(block.raw, variables, onVariableHover)}
              </p>
              <div className={`mt-1 transition-opacity duration-200 ${activeParagraph === i ? 'opacity-100' : 'opacity-0'}`}>
                <DontUnderstandButton paragraph={block.raw} paperTitle={paperTitle} />
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

      {/* Evidence chains */}
      {evidenceChains.length > 0 && readingMode === 'deep-dive' && (
        <ProgressiveReveal delay={400}>
          {evidenceChains.map((chain, i) => (
            <EvidenceChain key={i} chain={chain} />
          ))}
        </ProgressiveReveal>
      )}

      {/* Inline notebook demos for this section */}
      {notebookCells.length > 0 && (
        <ProgressiveReveal delay={500}>
          <InlineDemoSection
            cells={notebookCells}
            sectionId={section.id}
            onOpenInNotebook={onOpenNotebook}
          />
        </ProgressiveReveal>
      )}
    </section>
  )
}
