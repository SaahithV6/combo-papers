import { NextRequest, NextResponse } from 'next/server'
import { getButterbaseAdmin } from '@/lib/butterbase'
import demoData from '@/data/demo-fallback.json'

export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const decodedId = decodeURIComponent(id)

    const demoPaper = demoData.papers.find((paper) => paper.id === decodedId)
    if (demoPaper) return NextResponse.json(demoPaper)

    const admin = getButterbaseAdmin()
    if (admin) {
      try {
        const { data, error } = await admin
          .from('papers')
          .select('*')
          .eq('external_id', decodedId)
          .limit(1)
        if (error) throw error
        const row = Array.isArray(data) ? data[0] : data
        if (row && typeof row === 'object') {
          const processed = (row as { processed?: unknown }).processed
          if (processed && typeof processed === 'object') {
            return NextResponse.json(processed)
          }
        }
      } catch (error) {
        console.warn('Butterbase paper fetch failed:', error)
      }
    }

    const { getDb } = await import('@/lib/mongodb').catch(() => ({ getDb: null }))
    if (!getDb) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const db = await getDb()
    const col = db.collection('papers')
    const paper = await col.findOne({ id: decodedId })

    if (!paper) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(paper)
  } catch (error) {
    console.warn('MongoDB fetch error:', error)
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
  }
}
