import { NextRequest, NextResponse } from 'next/server'
import { searchArxiv } from '@/lib/arxiv'
import { searchWithBrowserUse } from '@/lib/browseruse'
import { searchSemanticScholar } from '@/lib/semanticScholar'
import { searchOpenAlex } from '@/lib/openalex'
import { PaperMetadata } from '@/lib/types'
import demoData from '@/data/demo-fallback.json'

export const runtime = 'nodejs'
export const maxDuration = 60

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
  return union.size === 0 ? 0 : intersection.size / union.size
}

function deduplicatePapers(papers: PaperMetadata[]): PaperMetadata[] {
  const unique: PaperMetadata[] = []
  for (const paper of papers) {
    const isDuplicate = unique.some(existing => {
      if (existing.doi && paper.doi && existing.doi === paper.doi) return true
      return titleSimilarity(existing.title, paper.title) > 0.85
    })
    if (!isDuplicate) unique.push(paper)
  }
  return unique
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Check if this is a demo query
    const isDemo = query.toLowerCase().includes('mechanistic interpretability') ||
      query.toLowerCase().includes('demo')

    if (isDemo) {
      return NextResponse.json({
        papers: demoData.papers,
        source: 'demo',
      })
    }

    // Build parallel search promises
    const searchPromises: Promise<PaperMetadata[]>[] = [
      searchArxiv(query, 10),
      searchSemanticScholar(query, 10),
      searchOpenAlex(query, 10),
    ]

    if (process.env.BROWSER_USE_API_KEY) {
      searchPromises.push(searchWithBrowserUse(query))
    }

    const results = await Promise.allSettled(searchPromises)
    const allPapers: PaperMetadata[] = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])

    // Deduplicate by DOI or title similarity > 85%
    const deduped = deduplicatePapers(allPapers)

    // Sort by citation count (desc), then year (desc)
    deduped.sort((a, b) => {
      const citDiff = (b.citationCount ?? 0) - (a.citationCount ?? 0)
      if (citDiff !== 0) return citDiff
      return (b.year ?? 0) - (a.year ?? 0)
    })

    const papers = deduped.slice(0, 20)

    return NextResponse.json({ papers, source: 'hybrid' })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
