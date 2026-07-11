export interface TldrSentence {
  sentence: string
  sourceSentenceId: string
}

export interface ContentBlock {
  id: string
  type: "paragraph" | "equation" | "figure" | "notebook" | "evidenceChain"
  raw: string
  rendered?: string
}

export interface MarginNote {
  id: string
  content: string
  source: "footnote" | "appendix" | "supplement"
  blockId: string
}

export interface Section {
  id: string
  title: string
  level: number
  content: ContentBlock[]
  isAppendix: boolean
  marginNotes: MarginNote[]
}

export interface Variable {
  symbol: string
  name: string
  definition: string
  units?: string
  firstSeenSectionId: string
  allOccurrences: string[]
}

export interface NotationWarning {
  symbol: string
  sectionA: string
  meaningA: string
  sectionB: string
  meaningB: string
}

export interface Equation {
  id: string
  latex: string
  label?: string
  storySteps: string[]
  relatedVariables: string[]
  blockId: string
}

export interface Figure {
  id: string
  url: string
  caption: string
  label: string
  referencedByBlockIds: string[]
}

export interface Citation {
  id: string
  title: string
  authors: string[]
  year?: number
  arxivId?: string
  url?: string
  isFoundational: boolean
}

export interface EvidenceChain {
  claim: string
  experiment: string
  figureId?: string
  statisticalResult: string
  conclusion: string
  blockId: string
}

export interface NotebookCell {
  id: string
  type: "markdown" | "code" | "output"
  content: string
  sectionId: string
  isEditable: boolean
}

export type PaperSourceName =
  | "Anna's Archive"
  | "arXiv"
  | "CORE"
  | "OA.mg"
  | "OpenAlex"
  | "PubMed Central"
  | "Unpaywall"
  | "DOAJ"
  | "Google Scholar"
  | "Semantic Scholar"
  | "Sci-Net"
  | "bioRxiv"

export interface PaperSource {
  name: PaperSourceName
  url: string
  type: "preprint" | "journal" | "archive" | "index"
}

export interface Paper {
  _id?: string
  threadId: string
  arxivId?: string
  title: string
  authors: string[]
  venue?: string
  year?: number
  pdfUrl: string
  doi?: string
  relevanceScore: number
  relevanceReason: string
  sourceUrl: string
  sourceName: PaperSourceName
  status: "queued" | "extracting" | "parsing" | "ready" | "error"
  tldr?: TldrSentence[]
  sections?: Section[]
  variables?: Variable[]
  equations?: Equation[]
  figures?: Figure[]
  citations?: Citation[]
  notationWarnings?: NotationWarning[]
  evidenceChains?: EvidenceChain[]
  githubUrl?: string
  notebookCells?: NotebookCell[]
  sandboxId?: string
  readersOnline?: number
}

export type ReadingMode = "skim" | "read" | "deep-dive"

export interface RabbitHoleItem {
  id: string
  title: string
  type: "paper" | "term" | "author" | "concept"
  paperId?: string
  term?: string
}

export interface ConceptMapNode {
  id: string
  label: string
  type: 'paper' | 'variable' | 'rabbithole'
  sectionId?: string
}

// Legacy compatibility alias
export type ProcessedPaper = Paper
export type PaperMetadata = Pick<Paper, "title" | "authors" | "pdfUrl" | "sourceUrl" | "sourceName" | "relevanceScore" | "relevanceReason"> & { id?: string; abstract?: string; url?: string; venue?: string; year?: number; doi?: string; arxivId?: string; githubUrl?: string; citationCount?: number }
