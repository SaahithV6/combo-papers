import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface PaperWithId {
  _id?: string
  [key: string]: unknown
}

export async function POST(request: NextRequest) {
  try {
    const paper = await request.json() as PaperWithId

    const paperId = (paper as { id?: string }).id || paper._id
    if (!paperId) {
      return NextResponse.json({ error: 'paper.id or paper._id is required' }, { status: 400 })
    }

    const { getDb } = await import('@/lib/mongodb').catch(() => ({ getDb: null }))
    if (!getDb) {
      return NextResponse.json({ stored: false, reason: 'MongoDB unavailable' })
    }

    const db = await getDb()
    const col = db.collection('papers')
    await col.updateOne(
      { id: paperId },
      { $set: { ...paper, id: paperId, updatedAt: Date.now() } },
      { upsert: true }
    )

    return NextResponse.json({ stored: true, id: paperId })
  } catch (error) {
    console.warn('MongoDB save error:', error)
    return NextResponse.json({ stored: false, reason: 'Save failed' })
  }
}
