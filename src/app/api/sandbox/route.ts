import { NextRequest, NextResponse } from 'next/server'
import { createSandbox } from '@/lib/daytona'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const { githubUrl } = await request.json()

    if (!githubUrl) {
      return NextResponse.json({ error: 'githubUrl is required' }, { status: 400 })
    }

    if (!process.env.DAYTONA_API_KEY) {
      return NextResponse.json({ error: 'DAYTONA_API_KEY not configured' }, { status: 503 })
    }

    const { sandboxId, iframeUrl } = await createSandbox(githubUrl)
    return NextResponse.json({ sandboxId, iframeUrl })
  } catch (error) {
    console.error('Sandbox creation error:', error)
    return NextResponse.json(
      { error: 'Sandbox creation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
