import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { getDb } = await import('@/lib/mongodb').catch(() => ({ getDb: null }))
    if (!getDb) {
      return NextResponse.json({ error: 'MongoDB unavailable' }, { status: 503 })
    }

    const db = await getDb()
    const docs = await db
      .collection('papers')
      .find({ pdfFileId: { $exists: true } })
      .project({ id: 1, title: 1, authors: 1, pdfFileId: 1, pdfSavedAt: 1 })
      .sort({ pdfSavedAt: -1 })
      .toArray()

    const papers = docs.map((d) => ({
      id: d.id as string,
      title: (d.title as string) || d.id,
      authors: (d.authors as string[]) || [],
      pdfFileId: d.pdfFileId as string,
      savedAt: (d.pdfSavedAt as number) || 0,
    }))

    return NextResponse.json({ papers })
  } catch (error) {
    console.warn('Saved papers fetch error:', error)
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
  }
}
