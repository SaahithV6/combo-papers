import { findPrerequisiteConcept } from './claude'

export interface Prerequisite {
  concept: string
  searchQuery: string
  sourceReference?: string
  paperTitle?: string
  paperUrl?: string
}

export async function detectPrerequisites(
  paragraph: string,
  paperTitle: string
): Promise<Prerequisite> {
  return findPrerequisiteConcept(paragraph, paperTitle)
}
