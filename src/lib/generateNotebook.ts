import { generateNotebookCells } from './claude'
import { NotebookCell, Section } from './types'

export async function generateNotebook(
  title: string,
  sections: Section[],
  githubUrl?: string
): Promise<NotebookCell[]> {
  return generateNotebookCells(
    title,
    sections.map(s => ({ id: s.id, title: s.title })),
    githubUrl
  )
}
