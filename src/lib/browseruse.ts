import { PaperMetadata, PaperSourceName } from './types'

const BROWSER_USE_API_URL = 'https://api.browser-use.com/api/v1'

const ALL_SOURCES: Array<{ name: PaperSourceName; url: string }> = [
  { name: "Anna's Archive", url: 'https://annas-archive.org/search?q={query}' },
  { name: "arXiv", url: 'https://arxiv.org/search/?searchtype=all&query={query}' },
  { name: "CORE", url: 'https://core.ac.uk/search?q={query}' },
  { name: "OA.mg", url: 'https://oa.mg/search?q={query}' },
  { name: "PubMed Central", url: 'https://www.ncbi.nlm.nih.gov/pmc/search/?query={query}' },
  { name: "Unpaywall", url: 'https://api.unpaywall.org/v2/{doi}?email=app@livingpapers.io' },
  { name: "DOAJ", url: 'https://doaj.org/search/articles?query={query}' },
  { name: "Google Scholar", url: 'https://scholar.google.com/scholar?q={query}' },
  { name: "Semantic Scholar", url: 'https://www.semanticscholar.org/search?q={query}&sort=Relevance' },
  { name: "Sci-Net", url: 'https://sci-net.org/search?q={query}' },
  { name: "bioRxiv", url: 'https://www.biorxiv.org/search/{query}' },
]

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a)
  const nb = normalizeTitle(b)
  if (na === nb) return 1
  const wordsA = new Set(na.split(' '))
  const wordsB = new Set(nb.split(' '))
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)))
  const union = new Set([...wordsA, ...wordsB])
  return intersection.size / union.size
}

function deduplicatePapers(papers: RawPaper[]): RawPaper[] {
  const unique: RawPaper[] = []
  for (const paper of papers) {
    const isDuplicate = unique.some(existing => {
      if (existing.doi && paper.doi && existing.doi === paper.doi) return true
      return titleSimilarity(existing.title, paper.title) > 0.85
    })
    if (!isDuplicate) unique.push(paper)
  }
  return unique
}

interface RawPaper {
  title: string
  authors: string[]
  abstract?: string
  url: string
  pdfUrl?: string
  doi?: string
  venue?: string
  year?: number
  sourceName: PaperSourceName
  githubUrl?: string
}

export async function searchWithBrowserUse(query: string): Promise<PaperMetadata[]> {
  const apiKey = process.env.BROWSER_USE_API_KEY
  if (!apiKey) {
    return []
  }

  const encodedQuery = encodeURIComponent(query)
  const sourceList = ALL_SOURCES.map((s, i) =>
    `${i + 1}. ${s.name}: ${s.url.replace('{query}', encodedQuery)}`
  ).join('\n')

  const task = `Search for research papers on: "${query}"

Traverse ALL 11 sources in this exact order:
${sourceList}

For each source, collect up to 5 papers. For each paper:
- Extract: title, authors (array of strings, first 5 max), abstract, URL to paper page, PDF URL if directly available, DOI if present, publication year, venue/journal name
- Check if full text PDF is freely accessible (not behind paywall)
- Extract GitHub repository URL if linked in paper abstract or page
- Record which source you found it from (use exact source name from the list above)

After collecting from all sources, deduplicate by: exact DOI match OR title similarity > 85%.

Return ONLY a JSON array with up to 20 unique papers:
[{
  "title": "...",
  "authors": ["First Author", "Second Author"],
  "abstract": "...",
  "url": "https://...",
  "pdfUrl": "https://...pdf",
  "doi": "10.xxxx/xxxxx",
  "venue": "NeurIPS 2023",
  "year": 2023,
  "sourceName": "Anna's Archive",
  "githubUrl": "https://github.com/..."
}]

Return ONLY valid JSON array. No other text.`

  try {
    const createResponse = await fetch(`${BROWSER_USE_API_URL}/task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ task, timeout: 180 }),
    })

    if (!createResponse.ok) {
      let body = ''
      try { body = await createResponse.text() } catch { /* ignore */ }
      console.warn(`Browser Use API error: ${createResponse.status} ${createResponse.statusText}${body ? ` — ${body}` : ''}`)
      return []
    }

    const { id: task_id } = await createResponse.json()

    for (let i = 0; i < 45; i++) {
      await new Promise(r => setTimeout(r, 4000))

      const statusResponse = await fetch(`${BROWSER_USE_API_URL}/task/${task_id}/status`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      })

      if (!statusResponse.ok) continue

      const status = await statusResponse.json()

      if (status.status === 'finished' && status.output) {
        let papers: RawPaper[] = []
        try {
          const jsonMatch = status.output.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            papers = JSON.parse(jsonMatch[0]) as RawPaper[]
          }
        } catch {
          throw new Error('Failed to parse Browser Use results as JSON')
        }

        const deduped = deduplicatePapers(papers)
        return deduped.map(p => ({
          id: p.doi ? `doi:${p.doi}` : `bu:${Date.now()}-${Math.random()}`,
          title: p.title,
          authors: p.authors,
          abstract: p.abstract || '',
          url: p.url,
          pdfUrl: p.pdfUrl || p.url,
          sourceUrl: p.url,
          sourceName: p.sourceName,
          relevanceScore: 50,
          relevanceReason: '',
          venue: p.venue,
          year: p.year,
          doi: p.doi,
          githubUrl: p.githubUrl,
        }))
      }

      if (status.status === 'failed') {
        throw new Error('Browser Use task failed: ' + (status.error || 'unknown error'))
      }
    }

    throw new Error('Browser Use task timed out after 3 minutes')
  } catch (error) {
    console.error('Browser Use error:', error)
    return []
  }
}
