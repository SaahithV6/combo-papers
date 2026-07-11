import { NextRequest, NextResponse } from 'next/server'
import { getButterbaseAdmin } from '@/lib/butterbase'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

/**
 * Save a shareable research experience (multi-paper thread + optional conflicts).
 * POST { query, title?, papers, conflicts?, plan?, userId? }
 * GET  ?id=...
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const query = body.query as string
    const papers = body.papers
    if (!query || !Array.isArray(papers) || papers.length === 0) {
      return NextResponse.json({ error: 'query and papers required' }, { status: 400 })
    }

    const id = randomUUID()
    const title = (body.title as string) || `Learning path: ${query}`
    const userId = (body.userId as string) || 'anonymous'
    const experience = {
      id,
      query,
      title,
      papers,
      conflicts: body.conflicts || null,
      plan: body.plan || null,
      library: body.library || null,
      createdAt: Date.now(),
    }

    const admin = getButterbaseAdmin()
    if (admin) {
      try {
        await admin.from('learning_threads').insert({
          id,
          user_id: userId,
          query,
          title,
          status: 'ready',
          plan: {
            ...((body.plan as object) || {}),
            conflicts: body.conflicts || null,
            experiencePapers: papers,
            library: body.library || null,
          },
          paper_ids: papers.map((p: { id?: string }) => p.id).filter(Boolean),
        })
      } catch (e) {
        console.warn('Butterbase experience persist failed:', e)
      }
    }

    // Episodic memory for this learner
    try {
      const { rememberLearnerEvent } = await import('@/lib/everos')
      await rememberLearnerEvent({
        userId,
        content: `Saved experience "${title}" for query "${query}" with ${papers.length} papers.`,
      })
    } catch {
      /* ignore */
    }

    return NextResponse.json({ id, experience, sharePath: `/thread/${id}` })
  } catch (error) {
    return NextResponse.json(
      { error: 'Save failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  const userId = request.nextUrl.searchParams.get('userId')

  const admin = getButterbaseAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Butterbase not configured' }, { status: 404 })
  }

  // List experiences for a learner
  if (userId && !id) {
    try {
      const { data, error } = await admin
        .from('learning_threads')
        .select('id,title,query,status,created_at,updated_at')
        .eq('user_id', userId)
        .limit(20)
      if (error) throw error
      const rows = Array.isArray(data) ? data : data ? [data] : []
      return NextResponse.json({ experiences: rows })
    } catch (e) {
      console.error('Experience list failed:', e)
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    }
  }

  if (!id) {
    return NextResponse.json({ error: 'id or userId required' }, { status: 400 })
  }

  try {
    const { data, error } = await admin.from('learning_threads').select('*').eq('id', id).limit(1)
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const plan = (row as { plan?: Record<string, unknown> }).plan || {}
    return NextResponse.json({
      experience: {
        id: (row as { id: string }).id,
        query: (row as { query: string }).query,
        title: (row as { title: string }).title,
        papers: plan.experiencePapers || [],
        conflicts: plan.conflicts || null,
        plan,
        library: plan.library || null,
        userId: (row as { user_id?: string }).user_id,
      },
    })
  } catch (e) {
    console.error('Experience GET failed:', e)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
