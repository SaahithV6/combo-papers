import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { DiscoveredArticle } from '@/app/api/browser-use/route'

export const runtime = 'nodejs'
export const maxDuration = 120

export interface ArticleAnalysis {
  summary: string
  mostRelevant: Array<{
    title: string
    url: string
    reason: string
    keyFindings: string[]
  }>
  synthesis: string
  researchBrief: string
}

export async function POST(request: NextRequest) {
  try {
    const { articles, topic } = await request.json() as {
      articles: DiscoveredArticle[]
      topic: string
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({ error: 'articles array is required' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const articleBlocks = articles
      .slice(0, 15)
      .map((a, i) =>
        `[${i + 1}] "${a.title}"
Authors: ${a.authors.slice(0, 3).join(', ')}
Year: ${a.year || 'unknown'}
Citations: ${a.citation_count ?? 'unknown'}
Source: ${a.source}
URL: ${a.url}
Abstract: ${(a.abstract || '').substring(0, 400)}`
      )
      .join('\n\n')

    const prompt = `You are a research analyst. The user is researching: "${topic}"

Here are ${articles.length} discovered academic articles:

${articleBlocks}

Provide a structured analysis as JSON:
{
  "summary": "2-3 sentence overview of the landscape of these papers",
  "mostRelevant": [
    {
      "title": "exact title",
      "url": "exact url",
      "reason": "why this paper is most relevant",
      "keyFindings": ["finding 1", "finding 2", "finding 3"]
    }
  ],
  "synthesis": "A paragraph synthesising the key themes, methodologies, and trends across these papers",
  "researchBrief": "A 3-4 paragraph research brief that a researcher could use as a starting point — covering the state of the art, open problems, and promising directions"
}

Include the top 5 most relevant papers in mostRelevant. Return ONLY valid JSON.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected Claude response type')

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in Claude response')

    const analysis = JSON.parse(jsonMatch[0]) as ArticleAnalysis

    // Persist to MongoDB if available (non-blocking)
    import('@/lib/mongodb')
      .then(async ({ getDb }) => {
        const db = await getDb()
        await db.collection('article_analyses').insertOne({
          topic,
          articleCount: articles.length,
          analysis,
          createdAt: Date.now(),
        })
      })
      .catch((e: unknown) => console.warn('MongoDB store analysis failed:', e))

    return NextResponse.json({ analysis, topic, articleCount: articles.length })
  } catch (error) {
    console.error('analyze-articles error:', error)
    return NextResponse.json(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
