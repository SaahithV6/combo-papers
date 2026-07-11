import { NextRequest, NextResponse } from 'next/server'
import { withSpan } from '@/lib/laminar'
import { checkRateLimit } from '@/lib/rateLimit'
import { processPaperPayload } from '@/lib/processPaper'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(request, 'process', { limit: 8, windowMs: 5 * 60_000 })
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Generation limit reached. Try again in a few minutes or use the guided demo.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
    )
  }

  return withSpan('process_paper', async () => {
    try {
      const body = await request.json()
      const paperData = body.paper || body
      const result = await processPaperPayload(paperData)
      return NextResponse.json(result)
    } catch (error) {
      console.error('Processing error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      const status = message.includes('PDF') || message.includes('title') ? 400 : 500
      return NextResponse.json({ error: 'Processing failed', details: message }, { status })
    }
  })
}
