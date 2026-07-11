import { NextRequest, NextResponse } from 'next/server'
import { searchOpenAlex } from '@/lib/openalex'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get('title')

  if (!title) {
    return NextResponse.json({ error: 'title query parameter is required' }, { status: 400 })
  }

  // Check MongoDB cache first
  try {
    const { getDb } = await import('@/lib/mongodb')
    const db = await getDb()
    const cached = await db.collection('citation_cache').findOne({ title })
    if (cached) {
      return NextResponse.json({ paper: cached.paper })
    }
  } catch {
    // MongoDB unavailable — proceed without cache
  }

  const results = await searchOpenAlex(title, 3)
  const paper = results[0] || null

  // Cache in MongoDB (non-blocking)
  if (paper) {
    import('@/lib/mongodb')
      .then(async ({ getDb }) => {
        const db = await getDb()
        await db.collection('citation_cache').updateOne(
          { title },
          { $set: { title, paper, cachedAt: Date.now() } },
          { upsert: true }
        )
      })
      .catch((e: unknown) => console.warn('Citation cache persist failed:', e))
  }

  return NextResponse.json({ paper })
}
