import { NextRequest, NextResponse } from 'next/server'
import {
  applyLearningSignal,
  ensureLearner,
  listLearnerThreads,
  loadLearnerContext,
  rowToProfile,
  updateLearnerProfile,
} from '@/lib/learner'

export const runtime = 'nodejs'

/**
 * GET  ?userId=...&query=optional  → profile + EverOS memories + recent threads
 * POST { userId, email?, displayName?, goals? } → ensure learner (Butterbase + EverOS seed)
 * PATCH { userId, goals?, knownConcepts?, gapConcepts?, preferences?, email? }
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')
  const query = request.nextUrl.searchParams.get('query') || undefined
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    await ensureLearner({ userId })
    const { row, profile, memories } = await loadLearnerContext(userId, query || 'learning progress')
    const threads = await listLearnerThreads(userId)
    return NextResponse.json({
      learner: row,
      profile: profile || (row ? rowToProfile(row) : null),
      memories,
      threads,
    })
  } catch (e) {
    console.error('Learner GET failed:', e)
    return NextResponse.json(
      { error: 'Failed to load learner', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userId = body.userId as string
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const row = await ensureLearner({
      userId,
      email: body.email,
      displayName: body.displayName,
      goals: body.goals,
    })

    return NextResponse.json({
      learner: row,
      profile: row ? rowToProfile(row) : null,
    })
  } catch (e) {
    console.error('Learner POST failed:', e)
    return NextResponse.json(
      { error: 'Failed to ensure learner', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const userId = body.userId as string
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Optional: apply a single learning signal (same as adapt side-effect)
    if (body.eventType && body.concept) {
      const row = await applyLearningSignal({
        userId,
        eventType: body.eventType,
        concept: body.concept,
      })
      return NextResponse.json({ learner: row, profile: row ? rowToProfile(row) : null })
    }

    const row = await updateLearnerProfile(userId, {
      goals: body.goals,
      knownConcepts: body.knownConcepts,
      gapConcepts: body.gapConcepts,
      preferences: body.preferences,
      email: body.email,
      displayName: body.displayName,
    })

    return NextResponse.json({
      learner: row,
      profile: row ? rowToProfile(row) : null,
    })
  } catch (e) {
    console.error('Learner PATCH failed:', e)
    return NextResponse.json(
      { error: 'Failed to update learner', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    )
  }
}
