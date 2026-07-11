import { PaperMetadata } from './types'

interface SemanticScholarPaper {
  paperId: string
  title: string
  abstract?: string
  year?: number
  authors: Array<{ authorId: string; name: string }>
  externalIds?: { DOI?: string; ArXiv?: string }
  openAccessPdf?: { url: string }
  citationCount?: number
  url?: string
}

interface SemanticScholarResponse {
  data: SemanticScholarPaper[]
  total?: number
}

export async function searchSemanticScholar(query: string, limit = 10): Promise<PaperMetadata[]> {
  const encodedQuery = encodeURIComponent(query)
  const fields = 'title,abstract,authors,year,externalIds,openAccessPdf,citationCount,url'
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedQuery}&limit=${limit}&fields=${fields}`

  // Respect rate limits (~100 req/5min)
  await new Promise(r => setTimeout(r, 1000))

  const maxRetries = 3
  let lastStatus = 0

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 2s, 4s
      await new Promise(r => setTimeout(r, 2000 * attempt))
    }

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'LivingPapersV2/1.0' },
      })

      if (response.status === 429) {
        lastStatus = 429
        console.warn(`Semantic Scholar API rate limited (429), attempt ${attempt + 1}/${maxRetries}`)
        continue
      }

      if (!response.ok) {
        console.warn(`Semantic Scholar API error: ${response.status}`)
        return []
      }

      const data = await response.json() as SemanticScholarResponse

      return (data.data || []).map((paper, index) => {
        const doi = paper.externalIds?.DOI
        const arxivId = paper.externalIds?.ArXiv
        const pdfUrl = paper.openAccessPdf?.url || (arxivId ? `https://arxiv.org/pdf/${arxivId}` : undefined)
        const paperUrl = paper.url || (arxivId ? `https://arxiv.org/abs/${arxivId}` : `https://www.semanticscholar.org/paper/${paper.paperId}`)

        return {
          id: doi ? `doi:${doi}` : `ss:${paper.paperId}`,
          title: paper.title,
          authors: paper.authors.slice(0, 5).map(a => a.name),
          abstract: paper.abstract || '',
          url: paperUrl,
          pdfUrl: pdfUrl || paperUrl,
          sourceUrl: paperUrl,
          sourceName: 'Semantic Scholar' as const,
          venue: undefined,
          year: paper.year,
          doi,
          arxivId,
          relevanceScore: Math.max(0.5, 1 - index * 0.05),
          relevanceReason: '',
          citationCount: paper.citationCount,
        }
      })
    } catch (error) {
      console.error('Semantic Scholar search error:', error)
      return []
    }
  }

  if (lastStatus === 429) {
    console.warn(`Semantic Scholar API still rate limited (429) after ${maxRetries} attempts`)
  }
  return []
}
