import { NextRequest, NextResponse } from 'next/server'
import { mentorAdapt } from '@/lib/agent/mentor'
import { getButterbaseAdmin } from '@/lib/butterbase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userId = (body.userId as string) || 'anonymous'
    const eventType = body.eventType as
      | 'dont_understand'
      | 'checkpoint_fail'
      | 'checkpoint_pass'
      | 'deep_engagement'
      | 'skim_exit'

    if (!eventType) {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 })
    }

    const turn = await mentorAdapt({
      userId,
      eventType,
      concept: body.concept,
      paperTitle: body.paperTitle,
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

    return NextResponse.json({ turn })
  } catch (error) {
    console.error('Agent adapt error:', error)
    return NextResponse.json(
      { error: 'Adapt failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
