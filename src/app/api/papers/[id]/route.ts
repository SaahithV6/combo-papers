import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { getDb } = await import('@/lib/mongodb').catch(() => ({ getDb: null }))
    if (!getDb) {
      return NextResponse.json({ error: 'MongoDB unavailable' }, { status: 503 })
    }

    const db = await getDb()
    const col = db.collection('papers')
    const paper = await col.findOne({ id })

    if (!paper) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(paper)
  } catch (error) {
    console.warn('MongoDB fetch error:', error)
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
  }
}
