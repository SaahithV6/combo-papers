import { NextRequest, NextResponse } from 'next/server'
import { searchArxiv } from '@/lib/arxiv'
import { searchWithBrowserUse } from '@/lib/browseruse'
import { searchSemanticScholar } from '@/lib/semanticScholar'
import { searchOpenAlex } from '@/lib/openalex'
import { PaperMetadata } from '@/lib/types'
import { mentorOrient } from '@/lib/agent/mentor'
import type { LearnerProfile } from '@/lib/agent/types'
import {
  buildLibraryDiscoveryPlan,
  parseInstitutionalEmail,
  rankForInstitutionalAccess,
  resolveJournalAccess,
} from '@/lib/institutional'
import { ensureLearner, getLearnerRow, rowToProfile } from '@/lib/learner'
import demoData from '@/data/demo-fallback.json'
import { authErrorResponse, resolveRequestUserId } from '@/lib/serverAuth'
import { checkRateLimit } from '@/lib/rateLimit'

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
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)))
  const union = new Set([...wordsA, ...wordsB])
  return union.size === 0 ? 0 : intersection.size / union.size
}

function deduplicatePapers(papers: PaperMetadata[]): PaperMetadata[] {
  const unique: PaperMetadata[] = []
  for (const paper of papers) {
    const isDuplicate = unique.some((existing) => {
      if (existing.doi && paper.doi && existing.doi === paper.doi) return true
      return titleSimilarity(existing.title, paper.title) > 0.85
    })
    if (!isDuplicate) unique.push(paper)
  }
  return unique
}

export async function POST(request: NextRequest) {
  try {
    const rate = checkRateLimit(request, 'agent-search', { limit: 12, windowMs: 5 * 60_000 })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Search limit reached. Try again shortly or open the guided demo.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
      )
    }
    const body = await request.json()
    const query = body.query as string
    const identity = await resolveRequestUserId(
      request,
      (body.userId as string | undefined) || 'anonymous'
    )
    const userId = identity.userId
    const email = identity.email || process.env.INSTITUTIONAL_EMAIL
    const knownConcepts = (body.knownConcepts as string[] | undefined) || []
    const gapConcepts = (body.gapConcepts as string[] | undefined) || []
    const goals = (body.goals as string[] | undefined) || []

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const institutional = parseInstitutionalEmail(email)

    // Load durable learner profile (Butterbase) → feed plan + EverOS
    await ensureLearner({ userId, email: email || undefined })
    const stored = await getLearnerRow(userId)
    const storedProfile = stored ? rowToProfile(stored) : null
    const mergedKnown = [
      ...knownConcepts,
      ...(storedProfile?.knownConcepts || []),
    ]
    const mergedGaps = [...gapConcepts, ...(storedProfile?.gapConcepts || [])]
    const mergedGoals = [...goals, ...(storedProfile?.goals || [])]

    const isDemo =
      query.toLowerCase().includes('mechanistic interpretability') ||
      query.toLowerCase().includes('demo')

    let papers: PaperMetadata[]
    let source = 'hybrid'

    if (isDemo) {
      papers = demoData.papers as PaperMetadata[]
      source = 'demo'
    } else {
      const searchPromises: Promise<PaperMetadata[]>[] = [
        searchArxiv(query, 10),
        searchSemanticScholar(query, 10),
        searchOpenAlex(query, 10),
      ]
      if (process.env.BROWSER_USE_API_KEY) {
        searchPromises.push(searchWithBrowserUse(query))
      }

      const results = await Promise.allSettled(searchPromises)
      const allPapers: PaperMetadata[] = results.flatMap((r) =>
        r.status === 'fulfilled' ? r.value : []
      )
      papers = deduplicatePapers(allPapers)
      papers.sort((a, b) => {
        const citDiff = (b.citationCount ?? 0) - (a.citationCount ?? 0)
        if (citDiff !== 0) return citDiff
        return (b.year ?? 0) - (a.year ?? 0)
      })
      papers = papers.slice(0, 20)
    }

    // Institutional upgrade: Unpaywall OA + OpenAthens publisher links + UC Library Search
    let library = null
    if (institutional?.isInstitutional) {
      papers = rankForInstitutionalAccess(papers, institutional)
      library = buildLibraryDiscoveryPlan(query, institutional)
      const withDoi = papers.filter((p) => p.doi).slice(0, 5)
      await Promise.all(
        withDoi.map(async (paper) => {
          const resolved = await resolveJournalAccess(paper.doi!, institutional)
          if (resolved?.pdfUrl) {
            paper.pdfUrl = resolved.pdfUrl
          }
          if (resolved?.accessUrl) {
            paper.url = resolved.accessUrl
            paper.sourceUrl = resolved.accessUrl
          }
          if (resolved?.journal) paper.venue = resolved.journal
          paper.relevanceReason = `${paper.relevanceReason || 'Relevant'} · UCSC OpenAthens / ${institutional.domain}`
        })
      )
      source = `${source}+ucsc-library`
    }

    const profile: LearnerProfile = {
      userId,
      email: institutional?.email || storedProfile?.email,
      institutionDomain: institutional?.domain || storedProfile?.institutionDomain,
      goals: [...new Set(mergedGoals)],
      knownConcepts: [...new Set(mergedKnown)],
      gapConcepts: [...new Set(mergedGaps)],
      preferences: {
        preferJournals: Boolean(
          institutional?.isInstitutional || storedProfile?.preferences?.preferJournals
        ),
        readingMode: storedProfile?.preferences?.readingMode,
      },
    }

    const mentor = await mentorOrient({ query, papers, profile })

    return NextResponse.json({
      papers,
      source,
      mentor,
      library,
      institutional: institutional
        ? {
            domain: institutional.domain,
            isInstitutional: institutional.isInstitutional,
            openAthensDomain: institutional.openAthensDomain || null,
          }
        : null,
    })
  } catch (error) {
    const auth = authErrorResponse(error)
    if (auth) return NextResponse.json(auth.body, { status: auth.status })
    console.error('Agent search error:', error)
    return NextResponse.json(
      {
        error: 'Agent search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
