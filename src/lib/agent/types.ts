import type { PaperMetadata } from '../types'

export type MentorMode = 'orient' | 'teach' | 'probe' | 'plan' | 'adapt'

export interface LearnerProfile {
  userId: string
  email?: string
  institutionDomain?: string
  goals: string[]
  knownConcepts: string[]
  gapConcepts: string[]
  preferences?: {
    readingMode?: 'skim' | 'read' | 'deep-dive'
    preferJournals?: boolean
  }
}

export interface LearningStep {
  id: string
  kind: 'paper' | 'prerequisite' | 'checkpoint' | 'lab' | 'synthesis'
  title: string
  rationale: string
  paper?: PaperMetadata
  concept?: string
  status: 'pending' | 'active' | 'done' | 'skipped'
}

export interface LearningPlan {
  id: string
  query: string
  title: string
  objective: string
  steps: LearningStep[]
  createdAt: number
}

export interface MentorTurn {
  mode: MentorMode
  message: string
  nextAction?: {
    type: 'open_paper' | 'run_checkpoint' | 'surface_prerequisite' | 'revise_plan'
    payload?: Record<string, unknown>
  }
  plan?: LearningPlan
  memoriesUsed?: string[]
}
