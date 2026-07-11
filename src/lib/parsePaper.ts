import { parsePaper as parsePaperWithClaude } from './claude'
import { Paper } from './types'

export async function parsePaperFromText(
  title: string,
  authors: string[],
  pdfText: string,
  sourceUrl: string
): Promise<Partial<Paper>> {
  return parsePaperWithClaude(title, authors, pdfText, sourceUrl)
}
