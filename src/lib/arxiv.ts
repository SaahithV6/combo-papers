import { PaperMetadata } from './types'

export async function searchArxiv(query: string, maxResults = 10): Promise<PaperMetadata[]> {
  const encodedQuery = encodeURIComponent(query)
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodedQuery}&start=0&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ComboPapers/1.0' },
    })
    
    if (!response.ok) throw new Error(`arXiv API error: ${response.status}`)
    
    const text = await response.text()
    return parseArxivXML(text)
  } catch (error) {
    console.error('arXiv search error:', error)
    return []
  }
}

function parseArxivXML(xml: string): PaperMetadata[] {
  const papers: PaperMetadata[] = []
  
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let match
  let index = 0
  
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1]
    
    const id = extractTag(entry, 'id')?.split('/abs/')?.pop() || ''
    const title = extractTag(entry, 'title')?.replace(/\s+/g, ' ').trim() || ''
    const abstract = extractTag(entry, 'summary')?.replace(/\s+/g, ' ').trim() || ''
    const published = extractTag(entry, 'published') || ''
    const year = published ? new Date(published).getFullYear() : undefined
    
    const authors: string[] = []
    const authorRegex = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g
    let authorMatch
    while ((authorMatch = authorRegex.exec(entry)) !== null) {
      authors.push(authorMatch[1].trim())
    }
    
    const arxivId = extractTag(entry, 'id')?.split('/abs/')?.pop() || ''
    
    if (id && title) {
      // Preserve arXiv's relevance ordering: first result scores highest
      const relevanceScore = Math.max(0.5, 1 - index * 0.05)
      papers.push({
        id: `arxiv:${arxivId}`,
        title,
        authors,
        abstract,
        url: `https://arxiv.org/abs/${arxivId}`,
        pdfUrl: `https://arxiv.org/pdf/${arxivId}`,
        sourceUrl: `https://arxiv.org/abs/${arxivId}`,
        sourceName: 'arXiv',
        venue: 'arXiv',
        year,
        relevanceScore,
        relevanceReason: '',
      })
      index++
    }
  }
  
  return papers
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
  const match = regex.exec(xml)
  return match ? match[1] : null
}
