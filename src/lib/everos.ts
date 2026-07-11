/**
 * EverOS (EverMind) — persistent memory for the lifelong learning agent.
 * Docs: https://docs.evermind.ai/llms-full.txt
 * API:  https://api.evermind.ai
 */

const EVEROS_API = process.env.EVEROS_API_URL || 'https://api.evermind.ai'

export function isEverosConfigured(): boolean {
  return Boolean(process.env.EVEROS_API_KEY)
}

function nowMs() {
  return Date.now()
}

async function everosFetch(path: string, body: Record<string, unknown>) {
  const apiKey = process.env.EVEROS_API_KEY
  if (!apiKey) return null

  const res = await fetch(`${EVEROS_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('EverOS error', res.status, text)
    return null
  }

  return res.json().catch(() => ({}))
}

/** Personal learner memory (profile / episodes extracted async). */
export async function rememberLearnerEvent(params: {
  userId: string
  sessionId?: string
  role?: 'user' | 'assistant'
  content: string
  asyncMode?: boolean
}) {
  return everosFetch('/api/v1/memories', {
    user_id: params.userId,
    session_id: params.sessionId || 'combo-papers',
    async_mode: params.asyncMode ?? true,
    messages: [
      {
        role: params.role || 'user',
        timestamp: nowMs(),
        content: params.content,
      },
    ],
  })
}

/** Agent trajectory memory (cases → skills). */
export async function rememberAgentTrajectory(params: {
  userId: string
  sessionId?: string
  content: string
  role?: 'user' | 'assistant' | 'tool'
}) {
  return everosFetch('/api/v1/memories/agent', {
    user_id: params.userId,
    session_id: params.sessionId || 'combo-papers-agent',
    async_mode: true,
    messages: [
      {
        role: params.role || 'assistant',
        timestamp: nowMs(),
        content: params.content,
      },
    ],
  })
}

export async function searchLearnerMemory(params: {
  userId: string
  query: string
  topK?: number
  method?: 'keyword' | 'vector' | 'hybrid' | 'agentic'
}) {
  return everosFetch('/api/v1/memories/search', {
    query: params.query,
    filters: { user_id: params.userId },
    method: params.method || 'hybrid',
    top_k: params.topK ?? 8,
  })
}

export async function flushLearnerMemory(userId: string, sessionId?: string) {
  return everosFetch('/api/v1/memories/flush', {
    user_id: userId,
    ...(sessionId ? { session_id: sessionId } : {}),
  })
}

/** Seed / refresh institutional learner profile facts. */
export async function seedInstitutionalLearner(params: {
  email: string
  institution?: string
  goals?: string[]
}) {
  const goals = (params.goals || []).join('; ')
  return rememberLearnerEvent({
    userId: params.email,
    sessionId: 'profile-bootstrap',
    content: [
      `Learner email: ${params.email}.`,
      params.institution ? `Institution: ${params.institution}.` : '',
      'Prefer peer-reviewed journal versions over arXiv preprints when institutional access allows.',
      goals ? `Learning goals: ${goals}.` : '',
      'Product context: Combo Papers — agentic living-papers mentor for literature review with interactive simulations and visualizations.',
    ]
      .filter(Boolean)
      .join(' '),
  })
}
