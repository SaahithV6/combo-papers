import { NextRequest, NextResponse } from 'next/server'
import { analyzeApproachConflicts } from '@/lib/agent/conflicts'
import { rememberAgentTrajectory } from '@/lib/everos'
import { authErrorResponse, resolveRequestUserId } from '@/lib/serverAuth'
import { checkRateLimit } from '@/lib/rateLimit'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const rate = checkRateLimit(request, 'conflicts', { limit: 10, windowMs: 5 * 60_000 })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Comparison limit reached. Try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
      )
    }
    const body = await request.json()
    const query = (body.query as string) || 'research topic'
    const papers = (body.papers as Array<{
      id?: string
      title: string
      abstract?: string
      venue?: string
      year?: number
      tldr?: Array<{ sentence: string }>
      relevanceReason?: string
    }>) || []
    const { userId } = await resolveRequestUserId(
      request,
      (body.userId as string) || 'anonymous'
    )

    if (!Array.isArray(papers) || papers.length < 2) {
      return NextResponse.json(
        { error: 'Provide at least two papers to compare' },
        { status: 400 }
      )
    }

    const analysis = await analyzeApproachConflicts(query, papers)

    void rememberAgentTrajectory({
      userId,
      content: `Conflict analysis for "${query}": ${analysis.conflicts.length} tensions; ${analysis.summary}`,
    })

    return NextResponse.json({ analysis })
  } catch (error) {
    const auth = authErrorResponse(error)
    if (auth) return NextResponse.json(auth.body, { status: auth.status })
    console.error('Conflicts API error:', error)
    return NextResponse.json(
      {
        error: 'Conflict analysis failed',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    )
  }
}
