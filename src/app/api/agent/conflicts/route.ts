import { NextRequest, NextResponse } from 'next/server'
import { analyzeApproachConflicts } from '@/lib/agent/conflicts'
import { rememberAgentTrajectory } from '@/lib/everos'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
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
    const userId = (body.userId as string) || 'anonymous'

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
