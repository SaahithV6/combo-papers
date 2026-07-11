import { PaperMetadata } from './types'

interface OpenAlexAuthorship {
  author: { display_name: string }
}

interface OpenAlexWork {
  id: string
  display_name: string
  authorships: OpenAlexAuthorship[]
  publication_year?: number
  doi?: string
  open_access?: { oa_url?: string; is_oa?: boolean }
  primary_location?: { landing_page_url?: string; pdf_url?: string }
  abstract_inverted_index?: Record<string, number[]>
  cited_by_count?: number
}

interface OpenAlexResponse {
  results: OpenAlexWork[]
}

function reconstructAbstract(invertedIndex?: Record<string, number[]>): string {
  if (!invertedIndex) return ''
  const words: string[] = []
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words[pos] = word
    }
  }
  return words.filter(Boolean).join(' ')
}

export async function searchOpenAlex(query: string, limit = 10): Promise<PaperMetadata[]> {
  const encodedQuery = encodeURIComponent(query)
  const fields = 'id,display_name,authorships,publication_year,doi,open_access,primary_location,abstract_inverted_index,cited_by_count'
  const url = `https://api.openalex.org/works?search=${encodedQuery}&per_page=${limit}&select=${fields}&mailto=app@livingpapers.io`

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ComboPapers/1.0 (mailto:app@livingpapers.io)' },
    })

    if (!response.ok) {
      console.warn(`OpenAlex API error: ${response.status}`)
      return []
    }

    const data = await response.json() as OpenAlexResponse

    return (data.results || []).map((work, index) => {
      const doi = work.doi ? work.doi.replace('https://doi.org/', '') : undefined
      const landingUrl = work.primary_location?.landing_page_url || work.id
      const pdfUrl = work.open_access?.oa_url || work.primary_location?.pdf_url || landingUrl

      return {
        id: doi ? `doi:${doi}` : `oa:${work.id}`,
        title: work.display_name,
        authors: (work.authorships || []).slice(0, 5).map(a => a.author.display_name),
        abstract: reconstructAbstract(work.abstract_inverted_index),
        url: landingUrl,
        pdfUrl,
        sourceUrl: landingUrl,
        sourceName: 'OpenAlex' as const,
        year: work.publication_year,
        doi,
        relevanceScore: Math.max(0.5, 1 - index * 0.05),
        relevanceReason: '',
        citationCount: work.cited_by_count,
      }
    })
  } catch (error) {
    console.error('OpenAlex search error:', error)
    return []
  }
}
