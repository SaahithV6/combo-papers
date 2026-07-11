import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { searchArxiv } from '@/lib/arxiv'
import { searchOpenAlex } from '@/lib/openalex'
import { searchSemanticScholar } from '@/lib/semanticScholar'
import { searchWithBrowserUse } from '@/lib/browseruse'
import { PaperMetadata, ProcessedPaper } from '@/lib/types'
import { mentorOrient } from '@/lib/agent/mentor'
import type { LearnerProfile } from '@/lib/agent/types'
import {
  buildLibraryDiscoveryPlan,
  parseInstitutionalEmail,
  rankForInstitutionalAccess,
} from '@/lib/institutional'
import { ensureLearner, getLearnerRow, rowToProfile } from '@/lib/learner'
import { resolvePapersForPath } from '@/lib/resolvePaperPdf'
import { analyzeApproachConflicts } from '@/lib/agent/conflicts'
import { getButterbaseAdmin } from '@/lib/butterbase'
import { authErrorResponse, resolveRequestUserId } from '@/lib/serverAuth'
import { checkRateLimit } from '@/lib/rateLimit'
import { rememberLearnerEvent } from '@/lib/everos'
import { processPaperPayload } from '@/lib/processPaper'
import demoData from '@/data/demo-fallback.json'

export const runtime = 'nodejs'
export const maxDuration = 120

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

async function discoverPapers(query: string): Promise<{ papers: PaperMetadata[]; source: string }> {
  const isDemo =
    query.toLowerCase().includes('mechanistic interpretability') ||
    query.toLowerCase().includes('demo')

  if (isDemo) {
    return { papers: demoData.papers as PaperMetadata[], source: 'demo' }
  }

  const searchPromises: Promise<PaperMetadata[]>[] = [
    searchArxiv(query, 10),
    searchSemanticScholar(query, 10),
    searchOpenAlex(query, 10),
  ]
  if (process.env.BROWSER_USE_API_KEY) {
    searchPromises.push(searchWithBrowserUse(query))
  }

  const results = await Promise.allSettled(searchPromises)
  const all = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
  const papers = deduplicatePapers(all)
  papers.sort((a, b) => {
    const citDiff = (b.citationCount ?? 0) - (a.citationCount ?? 0)
    if (citDiff !== 0) return citDiff
    return (b.year ?? 0) - (a.year ?? 0)
  })
  return { papers: papers.slice(0, 20), source: 'hybrid' }
}

async function processOne(paper: PaperMetadata): Promise<ProcessedPaper | null> {
  try {
    const result = await processPaperPayload(paper)
    return {
      ...result.paper,
      id: paper.id || result.paper.id,
      relevanceReason: paper.relevanceReason || result.paper.relevanceReason,
    }
  } catch (error) {
    console.warn('Auto process skipped for', paper.id || paper.title, error)
    return null
  }
}

/**
 * One-shot: discover → resolve fetchable PDFs → build Living Pages → shareable thread.
 * Institutional-only papers are queued with OpenAthens links (not silently downloaded).
 */
export async function POST(request: NextRequest) {
  try {
    const rate = checkRateLimit(request, 'build-path', { limit: 4, windowMs: 5 * 60_000 })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Path-building limit reached. Try again shortly or open the guided demo.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
      )
    }

    const body = await request.json()
    const query = (body.query as string | undefined)?.trim()
    const maxPapers = Math.min(Math.max(Number(body.maxPapers) || 4, 2), 6)
    const identity = await resolveRequestUserId(
      request,
      (body.userId as string | undefined) || 'anonymous'
    )
    const email =
      identity.email ||
      (typeof body.email === 'string' ? body.email : undefined) ||
      process.env.INSTITUTIONAL_EMAIL

    if (!query && !Array.isArray(body.papers)) {
      return NextResponse.json({ error: 'query or papers required' }, { status: 400 })
    }

    await ensureLearner({ userId: identity.userId, email: email || undefined })
    const stored = await getLearnerRow(identity.userId)
    const storedProfile = stored ? rowToProfile(stored) : null
    const institutional = parseInstitutionalEmail(email)

    let papers: PaperMetadata[] = Array.isArray(body.papers) ? body.papers : []
    let source = 'provided'
    if (!papers.length && query) {
      const discovered = await discoverPapers(query)
      papers = discovered.papers
      source = discovered.source
    }

    if (institutional?.isInstitutional) {
      papers = rankForInstitutionalAccess(papers, institutional)
      source = `${source}+ucsc-library`
    }

    const library = institutional?.isInstitutional
      ? buildLibraryDiscoveryPlan(query || papers[0]?.title || 'research', institutional)
      : null

    const profile: LearnerProfile = {
      userId: identity.userId,
      email: institutional?.email || storedProfile?.email,
      institutionDomain: institutional?.domain || storedProfile?.institutionDomain,
      goals: storedProfile?.goals || [],
      knownConcepts: storedProfile?.knownConcepts || [],
      gapConcepts: storedProfile?.gapConcepts || [],
      preferences: {
        preferJournals: Boolean(institutional?.isInstitutional),
        readingMode: storedProfile?.preferences?.readingMode,
      },
    }

    const mentor = await mentorOrient({
      query: query || 'research topic',
      papers,
      profile,
    })

    const resolved = await resolvePapersForPath(papers, {
      email,
      maxFetchable: maxPapers,
    })

    const ready: ProcessedPaper[] = []
    for (const item of resolved.fetchable) {
      const processed = await processOne(item.paper)
      if (processed) ready.push(processed)
    }

    // Demo fallback: if nothing processed but we have demo papers, use them.
    if (ready.length === 0 && source.includes('demo')) {
      ready.push(...(demoData.papers as unknown as ProcessedPaper[]).slice(0, maxPapers))
    }

    if (ready.length === 0) {
      return NextResponse.json(
        {
          error:
            'No server-fetchable PDFs were available for an automatic Living Path. Open OpenAthens links for institutional papers, or select arXiv/OA sources.',
          institutionalQueue: resolved.institutionalQueue.map((item) => ({
            id: item.paper.id,
            title: item.paper.title,
            accessUrl: item.accessUrl,
            reason: item.reason,
          })),
          papers,
          mentor,
          library,
          source,
        },
        { status: 422 }
      )
    }

    let conflicts = null
    if (ready.length >= 2) {
      try {
        conflicts = await analyzeApproachConflicts(
          query || 'research topic',
          ready.map((paper) => ({
            id: paper.id,
            title: paper.title,
            venue: paper.venue,
            year: paper.year,
            tldr: paper.tldr,
            relevanceReason: paper.relevanceReason,
          }))
        )
      } catch (error) {
        console.warn('Conflict analysis skipped:', error)
      }
    }

    const id = randomUUID()
    const title = mentor.plan?.title || `Research path: ${query || 'literature'}`
    const experience = {
      id,
      query: query || title,
      title,
      papers: ready,
      conflicts,
      plan: mentor.plan || null,
      library,
      createdAt: Date.now(),
      institutionalQueue: resolved.institutionalQueue.map((item) => ({
        id: item.paper.id,
        title: item.paper.title,
        accessUrl: item.accessUrl,
        reason: item.reason,
        sourceName: item.paper.sourceName,
      })),
      accessSummary: {
        processed: ready.length,
        institutionalPending: resolved.institutionalQueue.length,
        unavailable: resolved.unavailable.length,
      },
    }

    const admin = getButterbaseAdmin()
    if (admin) {
      try {
        await admin.from('learning_threads').insert({
          id,
          user_id: identity.userId,
          query: experience.query,
          title,
          status: 'ready',
          plan: {
            ...(mentor.plan || {}),
            conflicts,
            experiencePapers: ready,
            library,
            institutionalQueue: experience.institutionalQueue,
            accessSummary: experience.accessSummary,
          },
          paper_ids: ready.map((paper) => paper.id).filter(Boolean),
        })
      } catch (error) {
        console.warn('Butterbase thread persist failed:', error)
      }
    }

    await rememberLearnerEvent({
      userId: identity.userId,
      content: `Auto-built research path “${title}” with ${ready.length} Living Pages; ${resolved.institutionalQueue.length} institutional papers queued for OpenAthens.`,
    }).catch(() => {})

    return NextResponse.json({
      id,
      sharePath: `/thread/${id}`,
      experience,
      mentor,
      source,
      library,
      accessSummary: experience.accessSummary,
    })
  } catch (error) {
    const auth = authErrorResponse(error)
    if (auth) return NextResponse.json(auth.body, { status: auth.status })
    console.error('Build path failed:', error)
    return NextResponse.json(
      {
        error: 'Automatic path build failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
