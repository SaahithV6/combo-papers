import { rememberAgentTrajectory, rememberLearnerEvent, searchLearnerMemory } from '@/lib/everos'
import type { LearnerProfile, LearningPlan, LearningStep, MentorTurn } from './types'
import type { PaperMetadata } from '@/lib/types'

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Build a curriculum-shaped plan from ranked papers + known learner gaps.
 * This is the service→agent graduation: search becomes a planned learning path.
 */
export function buildLearningPlan(params: {
  query: string
  papers: PaperMetadata[]
  profile?: LearnerProfile | null
}): LearningPlan {
  const { query, papers, profile } = params
  const steps: LearningStep[] = []

  // Gap-first: if the agent already knows weak concepts, open with a prerequisite step
  for (const gap of (profile?.gapConcepts || []).slice(0, 2)) {
    steps.push({
      id: makeId('step'),
      kind: 'prerequisite',
      title: `Grounding: ${gap}`,
      rationale: `Prior sessions showed friction around "${gap}". Establish this before the new papers.`,
      concept: gap,
      status: steps.length === 0 ? 'active' : 'pending',
    })
  }

  const selected = papers.slice(0, 5)
  selected.forEach((paper, index) => {
    steps.push({
      id: makeId('step'),
      kind: 'paper',
      title: paper.title,
      rationale:
        paper.relevanceReason ||
        `Semantically relevant to "${query}"${paper.venue ? ` · ${paper.venue}` : ''}`,
      paper,
      status: steps.some((s) => s.status === 'active') ? 'pending' : index === 0 ? 'active' : 'pending',
    })

    if (index === 0 || index === Math.min(2, selected.length - 1)) {
      steps.push({
        id: makeId('step'),
        kind: 'checkpoint',
        title: 'Did you follow that?',
        rationale: 'Free-text generation checkpoint — retention without grading.',
        concept: query,
        status: 'pending',
      })
    }
  })

  if (selected.length >= 2) {
    steps.push({
      id: makeId('step'),
      kind: 'synthesis',
      title: 'Thread synthesis',
      rationale: 'Compare claims, methods, and notation across the papers you engaged with.',
      status: 'pending',
    })
  }

  return {
    id: makeId('plan'),
    query,
    title: `Learning path: ${query}`,
    objective: `Build durable understanding of "${query}" through progressive papers, prerequisites, and checkpoints — not a one-shot summary.`,
    steps,
    createdAt: Date.now(),
  }
}

export async function mentorOrient(params: {
  query: string
  profile?: LearnerProfile | null
  papers: PaperMetadata[]
}): Promise<MentorTurn> {
  const plan = buildLearningPlan(params)
  const memories: string[] = []

  if (params.profile?.userId) {
    const mem = await searchLearnerMemory({
      userId: params.profile.userId,
      query: params.query,
      topK: 5,
    })
    const results =
      mem && typeof mem === 'object' && Array.isArray((mem as { results?: unknown[] }).results)
        ? ((mem as { results: Array<Record<string, unknown>> }).results)
        : []
    for (const r of results.slice(0, 3)) {
      const text = r.content || r.memory || r.text
      if (text) memories.push(String(text))
    }

    await rememberAgentTrajectory({
      userId: params.profile.userId,
      content: `Planned learning path for "${params.query}" with ${plan.steps.length} steps.`,
    })
    await rememberLearnerEvent({
      userId: params.profile.userId,
      content: `Started learning thread: ${params.query}`,
    })
  }

  const gapHint =
    params.profile?.gapConcepts?.length
      ? ` I remember friction around ${params.profile.gapConcepts.slice(0, 3).join(', ')} — we'll ground those first.`
      : ''

  const journalHint =
    params.profile?.preferences?.preferJournals || params.profile?.institutionDomain
      ? ' Preferring peer-reviewed journal versions where your institutional access allows.'
      : ''

  return {
    mode: 'orient',
    message: `I'll mentor you through "${params.query}" across ${params.papers.length} sources.${gapHint}${journalHint} First paper is ready when you are — we adapt as you struggle or accelerate.`,
    plan,
    memoriesUsed: memories,
    nextAction: {
      type: 'open_paper',
      payload: { paperId: plan.steps.find((s) => s.kind === 'paper')?.paper?.id },
    },
  }
}

export async function mentorAdapt(params: {
  userId: string
  eventType: 'dont_understand' | 'checkpoint_fail' | 'checkpoint_pass' | 'deep_engagement' | 'skim_exit'
  concept?: string
  paperTitle?: string
}): Promise<MentorTurn> {
  const { userId, eventType, concept, paperTitle } = params

  await rememberLearnerEvent({
    userId,
    content: JSON.stringify({ eventType, concept, paperTitle, at: new Date().toISOString() }),
  })

  switch (eventType) {
    case 'dont_understand':
    case 'checkpoint_fail':
      return {
        mode: 'adapt',
        message: concept
          ? `Signal received — "${concept}" is a gap. I'll surface the prerequisite source in the authors' own words, then return you to ${paperTitle || 'the paper'}.`
          : `Signal received — slowing down and inserting a prerequisite step before we continue.`,
        nextAction: { type: 'surface_prerequisite', payload: { concept } },
      }
    case 'deep_engagement':
      return {
        mode: 'teach',
        message: `Strong engagement on ${paperTitle || 'this paper'}. Next I'll push a harder related paper or an open lab cell.`,
        nextAction: { type: 'revise_plan', payload: { accelerate: true } },
      }
    case 'skim_exit':
      return {
        mode: 'plan',
        message: `You skimmed past key texture. I'll keep this paper in your spaced re-exposure strip and schedule a short revisit.`,
        nextAction: { type: 'revise_plan', payload: { reschedule: true } },
      }
    default:
      return {
        mode: 'probe',
        message: `Checkpoint cleared. Continuing the path.`,
        nextAction: { type: 'open_paper' },
      }
  }
}
