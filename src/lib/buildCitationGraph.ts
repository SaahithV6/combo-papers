import { Citation } from './types'

export interface CitationNode {
  id: string
  title: string
  authors: string[]
  year?: number
  isFoundational: boolean
  group: number
}

export interface CitationEdge {
  source: string
  target: string
  weight: number
}

export interface CitationGraph {
  nodes: CitationNode[]
  edges: CitationEdge[]
}

export function buildCitationGraph(
  paperTitle: string,
  citations: Citation[]
): CitationGraph {
  const nodes: CitationNode[] = [
    {
      id: 'root',
      title: paperTitle,
      authors: [],
      isFoundational: false,
      group: 0,
    },
    ...citations.map((c) => ({
      id: c.id,
      title: c.title,
      authors: c.authors,
      year: c.year,
      isFoundational: c.isFoundational,
      group: c.isFoundational ? 1 : 2,
    })),
  ]

  const edges: CitationEdge[] = citations.map(c => ({
    source: 'root',
    target: c.id,
    weight: c.isFoundational ? 2 : 1,
  }))

  return { nodes, edges }
}
