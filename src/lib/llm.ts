/**
 * Unified LLM client — Nebius Token Factory first, Anthropic optional fallback.
 * Nebius is OpenAI-compatible: https://api.tokenfactory.nebius.com/v1/
 */

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type ChatOptions = {
  maxTokens?: number
  temperature?: number
  json?: boolean
}

function nebiusConfigured() {
  return Boolean(process.env.NEBIUS_API_KEY)
}

function anthropicConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export function isLlmConfigured() {
  return nebiusConfigured() || anthropicConfigured()
}

export function activeLlmProvider(): 'nebius' | 'anthropic' | 'none' {
  if (nebiusConfigured()) return 'nebius'
  if (anthropicConfigured()) return 'anthropic'
  return 'none'
}

async function chatNebius(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
  const model =
    process.env.NEBIUS_MODEL ||
    'meta-llama/Meta-Llama-3.1-70B-Instruct'

  const res = await fetch('https://api.tokenfactory.nebius.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: '*/*',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens ?? 4000,
      temperature: options.temperature ?? 0.3,
      ...(options.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Nebius error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') {
    throw new Error('Nebius returned empty content')
  }
  return content
}

async function chatAnthropic(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const system = messages.find((m) => m.role === 'system')?.content
  const nonSystem = messages.filter((m) => m.role !== 'system')

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: options.maxTokens ?? 4000,
    system: system || undefined,
    messages: nonSystem.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected Anthropic response type')
  return block.text
}

/** Prefer Nebius Token Factory; fall back to Anthropic if configured. */
export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  if (nebiusConfigured()) {
    try {
      return await chatNebius(messages, options)
    } catch (e) {
      console.error('Nebius chat failed, trying Anthropic fallback if available:', e)
      if (!anthropicConfigured()) throw e
    }
  }

  if (anthropicConfigured()) {
    return chatAnthropic(messages, options)
  }

  throw new Error('No LLM configured. Set NEBIUS_API_KEY (preferred) or ANTHROPIC_API_KEY.')
}

export function extractJsonObject(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON object found in model response')
  return JSON.parse(match[0])
}

export function extractJsonArray(text: string): unknown[] {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('No JSON array found in model response')
  return JSON.parse(match[0])
}
