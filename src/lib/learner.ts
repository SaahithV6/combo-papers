/**
 * Per-user learner profile: Butterbase (durable structured state) + EverOS (episodic memory).
 */

import { getButterbaseAdmin } from '@/lib/butterbase'
import {
  rememberLearnerEvent,
  searchLearnerMemory,
} from '@/lib/everos'
import { institutionDomainFromEmail } from '@/lib/learnerIdentity'
import type { LearnerProfile } from '@/lib/agent/types'

export type LearnerRow = {
  id: string
  user_id: string
  email: string | null
  institution_domain: string | null
  display_name: string | null
  goals: string[] | null
  known_concepts: string[] | null
  gap_concepts: string[] | null
  preferences: Record<string, unknown> | null
  everos_user_id: string | null
  created_at?: string
  updated_at?: string
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(String).filter(Boolean)
}

function uniq(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    const key = item.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(item.trim())
  }
  return out
}

export function rowToProfile(row: LearnerRow): LearnerProfile {
  return {
    userId: row.user_id,
    email: row.email || undefined,
    institutionDomain: row.institution_domain || undefined,
    goals: asStringArray(row.goals),
    knownConcepts: asStringArray(row.known_concepts),
    gapConcepts: asStringArray(row.gap_concepts),
    preferences: {
      preferJournals: Boolean(
        (row.preferences as { preferJournals?: boolean } | null)?.preferJournals ??
          row.institution_domain
      ),
      readingMode: (row.preferences as { readingMode?: 'skim' | 'read' | 'deep-dive' } | null)
        ?.readingMode,
    },
  }
}

export async function getLearnerRow(userId: string): Promise<LearnerRow | null> {
  const admin = getButterbaseAdmin()
  if (!admin || !userId) return null
  try {
    const { data, error } = await admin.from('learners').select('*').eq('user_id', userId).limit(1)
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    return (row as LearnerRow) || null
  } catch (e) {
    console.warn('getLearnerRow failed:', e)
    return null
  }
}

/**
 * Upsert Butterbase learner + seed EverOS once when new / when email appears.
 * EverOS user_id === Butterbase user_id (stable across sessions).
 */
export async function ensureLearner(params: {
  userId: string
  email?: string | null
  displayName?: string | null
  goals?: string[]
}): Promise<LearnerRow | null> {
  const { userId } = params
  if (!userId) return null

  const admin = getButterbaseAdmin()
  const email = params.email || null
  const domain = institutionDomainFromEmail(email) || null
  const existing = await getLearnerRow(userId)

  if (!admin) {
    if (!existing) {
      await rememberLearnerEvent({
        userId,
        sessionId: 'profile-bootstrap',
        content: [
          `Learner ${userId} started Combo Papers.`,
          email ? `Email: ${email}.` : '',
          domain ? `Institution: ${domain}.` : '',
          'Prefer peer-reviewed journal versions when institutional access allows.',
          (params.goals || []).length ? `Goals: ${params.goals!.join('; ')}.` : '',
        ]
          .filter(Boolean)
          .join(' '),
      })
    }
    return (
      existing || {
        id: userId,
        user_id: userId,
        email,
        institution_domain: domain,
        display_name: params.displayName || null,
        goals: params.goals || [],
        known_concepts: [],
        gap_concepts: [],
        preferences: { preferJournals: Boolean(domain) },
        everos_user_id: userId,
      }
    )
  }

  if (existing) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (email && !existing.email) patch.email = email
    if (domain && !existing.institution_domain) patch.institution_domain = domain
    if (params.displayName && !existing.display_name) patch.display_name = params.displayName
    if (!existing.everos_user_id) patch.everos_user_id = userId
    if (Object.keys(patch).length > 1) {
      try {
        await admin.from('learners').update(patch).eq('user_id', userId)
      } catch (e) {
        console.warn('learner patch failed:', e)
      }
    }
    return { ...existing, ...patch } as LearnerRow
  }

  const row = {
    user_id: userId,
    email,
    institution_domain: domain,
    display_name: params.displayName || null,
    goals: params.goals || [],
    known_concepts: [],
    gap_concepts: [],
    preferences: { preferJournals: Boolean(domain) },
    everos_user_id: userId,
    updated_at: new Date().toISOString(),
  }

  try {
    const { data, error } = await admin.from('learners').insert(row)
    if (error) throw error
    const inserted = (Array.isArray(data) ? data[0] : data) as LearnerRow | null

    await rememberLearnerEvent({
      userId,
      sessionId: 'profile-bootstrap',
      content: [
        `New Combo Papers learner ${userId}.`,
        email ? `Email: ${email}.` : '',
        domain ? `Institution: ${domain}.` : '',
        'Prefer peer-reviewed journal versions when institutional access allows.',
        (params.goals || []).length ? `Goals: ${params.goals!.join('; ')}.` : '',
      ]
        .filter(Boolean)
        .join(' '),
    })

    return inserted || ({ id: userId, ...row } as LearnerRow)
  } catch (e) {
    console.warn('ensureLearner insert failed:', e)
    // Race: another request inserted — re-read
    return (await getLearnerRow(userId)) || ({ id: userId, ...row } as LearnerRow)
  }
}

export async function applyLearningSignal(params: {
  userId: string
  eventType: 'dont_understand' | 'checkpoint_fail' | 'checkpoint_pass' | 'deep_engagement' | 'skim_exit'
  concept?: string
}): Promise<LearnerRow | null> {
  const { userId, eventType, concept } = params
  if (!userId || !concept?.trim()) {
    return getLearnerRow(userId)
  }

  const row = (await getLearnerRow(userId)) || (await ensureLearner({ userId }))
  if (!row) return null

  let known = asStringArray(row.known_concepts)
  let gaps = asStringArray(row.gap_concepts)
  const c = concept.trim()

  if (eventType === 'dont_understand' || eventType === 'checkpoint_fail') {
    gaps = uniq([c, ...gaps])
    known = known.filter((k) => k.toLowerCase() !== c.toLowerCase())
  } else if (eventType === 'checkpoint_pass' || eventType === 'deep_engagement') {
    known = uniq([c, ...known])
    gaps = gaps.filter((g) => g.toLowerCase() !== c.toLowerCase())
  }

  const admin = getButterbaseAdmin()
  if (admin) {
    try {
      await admin
        .from('learners')
        .update({
          known_concepts: known,
          gap_concepts: gaps,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
    } catch (e) {
      console.warn('applyLearningSignal update failed:', e)
    }
  }

  return {
    ...row,
    known_concepts: known,
    gap_concepts: gaps,
  }
}

export async function updateLearnerProfile(
  userId: string,
  patch: {
    goals?: string[]
    knownConcepts?: string[]
    gapConcepts?: string[]
    preferences?: Record<string, unknown>
    email?: string
    displayName?: string
  }
): Promise<LearnerRow | null> {
  await ensureLearner({ userId, email: patch.email, displayName: patch.displayName, goals: patch.goals })
  const admin = getButterbaseAdmin()
  if (!admin) return getLearnerRow(userId)

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.goals) update.goals = patch.goals
  if (patch.knownConcepts) update.known_concepts = patch.knownConcepts
  if (patch.gapConcepts) update.gap_concepts = patch.gapConcepts
  if (patch.preferences) update.preferences = patch.preferences
  if (patch.email) {
    update.email = patch.email
    update.institution_domain = institutionDomainFromEmail(patch.email) || null
  }
  if (patch.displayName) update.display_name = patch.displayName

  try {
    await admin.from('learners').update(update).eq('user_id', userId)
    if (patch.goals?.length) {
      await rememberLearnerEvent({
        userId,
        content: `Updated learning goals: ${patch.goals.join('; ')}`,
      })
    }
  } catch (e) {
    console.warn('updateLearnerProfile failed:', e)
  }
  return getLearnerRow(userId)
}

export async function loadLearnerContext(userId: string, query?: string) {
  const row = await getLearnerRow(userId)
  const profile = row ? rowToProfile(row) : null
  let memories: string[] = []
  if (query) {
    const mem = await searchLearnerMemory({ userId, query, topK: 6 })
    const results =
      mem && typeof mem === 'object' && Array.isArray((mem as { results?: unknown[] }).results)
        ? ((mem as { results: Array<Record<string, unknown>> }).results)
        : []
    memories = results
      .map((r) => String(r.content || r.memory || r.text || ''))
      .filter(Boolean)
      .slice(0, 6)
  }
  return { row, profile, memories }
}

export async function listLearnerThreads(userId: string, limit = 12) {
  const admin = getButterbaseAdmin()
  if (!admin) return []
  try {
    const { data, error } = await admin
      .from('learning_threads')
      .select('id,title,query,status,created_at,updated_at')
      .eq('user_id', userId)
      .limit(limit)
    if (error) throw error
    const rows = Array.isArray(data) ? data : data ? [data] : []
    return rows as Array<{
      id: string
      title: string
      query: string
      status: string
      created_at?: string
      updated_at?: string
    }>
  } catch (e) {
    console.warn('listLearnerThreads failed:', e)
    return []
  }
}
