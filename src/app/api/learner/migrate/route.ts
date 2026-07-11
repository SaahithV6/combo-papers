import { NextRequest, NextResponse } from 'next/server'
import { getButterbaseAdmin } from '@/lib/butterbase'
import { ensureLearner, getLearnerRow, updateLearnerProfile } from '@/lib/learner'
import {
  flushLearnerMemory,
  rememberLearnerEvent,
  searchLearnerMemory,
} from '@/lib/everos'
import { authErrorResponse, resolveRequestUserId } from '@/lib/serverAuth'

export const runtime = 'nodejs'

function mergeStrings(a: unknown, b: unknown) {
  const values = [
    ...(Array.isArray(a) ? a.map(String) : []),
    ...(Array.isArray(b) ? b.map(String) : []),
  ]
  return Array.from(new Map(values.filter(Boolean).map((value) => [value.toLowerCase(), value])).values())
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const guestUserId = body.guestUserId as string
    const claimedUserId = body.userId as string
    if (!guestUserId?.startsWith('guest_') || !claimedUserId) {
      return NextResponse.json({ error: 'Valid guestUserId and userId required' }, { status: 400 })
    }

    const identity = await resolveRequestUserId(request, claimedUserId)
    if (!identity.authenticated) {
      return NextResponse.json({ error: 'Sign in before migrating guest work' }, { status: 401 })
    }

    const [guest, account] = await Promise.all([
      getLearnerRow(guestUserId),
      ensureLearner({ userId: identity.userId, email: identity.email }),
    ])

    if (guest) {
      await updateLearnerProfile(identity.userId, {
        goals: mergeStrings(account?.goals, guest.goals),
        knownConcepts: mergeStrings(account?.known_concepts, guest.known_concepts),
        gapConcepts: mergeStrings(account?.gap_concepts, guest.gap_concepts),
        preferences: {
          ...(guest.preferences || {}),
          ...(account?.preferences || {}),
        },
        email: identity.email,
      })
    }

    const admin = getButterbaseAdmin()
    if (admin) {
      await Promise.all(
        ['learning_threads', 'learning_events', 'saved_papers', 'agent_jobs'].map(async (table) => {
          try {
            await admin
              .from(table)
              .update({ user_id: identity.userId })
              .eq('user_id', guestUserId)
          } catch (error) {
            console.warn(`Guest migration skipped for ${table}:`, error)
          }
        })
      )
    }

    const recalled = await searchLearnerMemory({
      userId: guestUserId,
      query: 'learning goals, struggles, concepts, and research paths',
      topK: 12,
      method: 'hybrid',
    })
    const results =
      recalled &&
      typeof recalled === 'object' &&
      Array.isArray((recalled as { results?: unknown[] }).results)
        ? (recalled as { results: Array<Record<string, unknown>> }).results
        : []
    const memories = results
      .map((item) => String(item.content || item.memory || item.text || ''))
      .filter(Boolean)

    if (memories.length) {
      await rememberLearnerEvent({
        userId: identity.userId,
        sessionId: 'guest-migration',
        asyncMode: false,
        content: `Migrated guest learning context:\n${memories.join('\n')}`,
      })
      await flushLearnerMemory(guestUserId)
    }

    return NextResponse.json({ migrated: true, memories: memories.length })
  } catch (error) {
    const auth = authErrorResponse(error)
    if (auth) return NextResponse.json(auth.body, { status: auth.status })
    console.error('Guest learner migration failed:', error)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}
