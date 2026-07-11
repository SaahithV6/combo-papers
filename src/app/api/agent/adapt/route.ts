import { NextRequest, NextResponse } from 'next/server'
import { mentorAdapt } from '@/lib/agent/mentor'
import { getButterbaseAdmin } from '@/lib/butterbase'
import { applyLearningSignal, ensureLearner, rowToProfile } from '@/lib/learner'
import { authErrorResponse, resolveRequestUserId } from '@/lib/serverAuth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const identity = await resolveRequestUserId(request, (body.userId as string) || 'anonymous')
    const userId = identity.userId
    const eventType = body.eventType as
      | 'dont_understand'
      | 'checkpoint_fail'
      | 'checkpoint_pass'
      | 'deep_engagement'
      | 'skim_exit'

    if (!eventType) {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 })
    }

    await ensureLearner({
      userId,
      email: identity.email || (typeof body.email === 'string' ? body.email : undefined),
    })

    const turn = await mentorAdapt({
      userId,
      eventType,
      concept: body.concept,
      paperTitle: body.paperTitle,
    })

    const learner = await applyLearningSignal({
      userId,
      eventType,
      concept: body.concept,
    })

    const admin = getButterbaseAdmin()
    if (admin) {
      try {
        await admin.from('learning_events').insert({
          user_id: userId,
          event_type: eventType,
          concept: body.concept || null,
          paper_id: body.paperId || null,
          thread_id: body.threadId || null,
          payload: body,
        })
      } catch (e) {
        console.warn('Butterbase event persist skipped:', e)
      }
    }

    return NextResponse.json({
      turn,
      profile: learner ? rowToProfile(learner) : null,
    })
  } catch (error) {
    const auth = authErrorResponse(error)
    if (auth) return NextResponse.json(auth.body, { status: auth.status })
    console.error('Agent adapt error:', error)
    return NextResponse.json(
      { error: 'Adapt failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
