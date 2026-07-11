import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json() as { pdfBase64: string; title: string }

    if (!body.pdfBase64 || !body.title) {
      return NextResponse.json({ error: 'pdfBase64 and title are required' }, { status: 400 })
    }

    const { getDb } = await import('@/lib/mongodb').catch(() => ({ getDb: null }))
    if (!getDb) {
      return NextResponse.json({ error: 'MongoDB unavailable' }, { status: 503 })
    }

    const { savePdf } = await import('@/lib/gridfs')

    const pdfBuffer = Buffer.from(body.pdfBase64, 'base64')
    const fileId = await savePdf(id, pdfBuffer, {
      title: body.title,
      paperUrl: `/paper/${encodeURIComponent(id)}`,
      createdAt: Date.now(),
    })

    // Update papers collection with pdfFileId
    const db = await getDb()
    await db.collection('papers').updateOne(
      { id },
      { $set: { pdfFileId: fileId, pdfSavedAt: Date.now() } }
    )

    return NextResponse.json({ stored: true, fileId })
  } catch (error) {
    console.warn('PDF save error:', error)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}

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

    const { getPdfByPaperId } = await import('@/lib/gridfs')
    const result = await getPdfByPaperId(id)

    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Get the title from the papers collection for a nice filename
    const db = await getDb()
    const paper = await db.collection('papers').findOne({ id })
    const title = (paper?.title as string) || id
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    // Use RFC 5987 encoding to safely embed the filename in the header
    const safeFilename = `${slug || 'paper'}.pdf`
    const encodedFilename = encodeURIComponent(safeFilename)

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Content-Length': result.buffer.length.toString(),
      },
    })
  } catch (error) {
    console.warn('PDF fetch error:', error)
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
  }
}

export async function DELETE(
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
    const paper = await db.collection('papers').findOne({ id })
    if (!paper?.pdfFileId) {
      return NextResponse.json({ error: 'No PDF found' }, { status: 404 })
    }

    const { deletePdf } = await import('@/lib/gridfs')
    const deleted = await deletePdf(paper.pdfFileId as string)

    if (deleted) {
      await db.collection('papers').updateOne(
        { id },
        { $unset: { pdfFileId: '', pdfSavedAt: '' } }
      )
    }

    return NextResponse.json({ deleted })
  } catch (error) {
    console.warn('PDF delete error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
