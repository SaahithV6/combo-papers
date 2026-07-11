const SUPERMEMORY_BASE = 'https://api.supermemory.ai/v3'

export async function storeInSupermemory(
  content: string,
  metadata: { title: string; sourceUrl: string; paperId?: string }
): Promise<void> {
  const apiKey = process.env.SUPERMEMORY_API_KEY
  if (!apiKey) return

  try {
    const response = await fetch(`${SUPERMEMORY_BASE}/memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        content,
        metadata,
      }),
    })

    if (!response.ok) {
      console.warn(`Supermemory store failed: ${response.status}`)
    }
  } catch (error) {
    console.warn('Supermemory store error:', error)
  }
}

export async function querySupermemory(query: string): Promise<Array<{
  content: string
  metadata: { title: string; sourceUrl: string; paperId?: string }
  score: number
}>> {
  const apiKey = process.env.SUPERMEMORY_API_KEY
  if (!apiKey) return []

  try {
    const response = await fetch(`${SUPERMEMORY_BASE}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query, limit: 5 }),
    })

    if (!response.ok) {
      console.warn(`Supermemory query failed: ${response.status}`)
      return []
    }

    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.warn('Supermemory query error:', error)
    return []
  }
}
