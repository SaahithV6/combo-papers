import { NextRequest, NextResponse } from 'next/server'
import { executeCode } from '@/lib/daytona'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const { code, workspaceId } = await request.json() as { code: string; workspaceId?: string }

    if (!code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 })
    }

    if (!process.env.DAYTONA_API_KEY) {
      return NextResponse.json(
        { error: 'Sandbox unavailable: DAYTONA_API_KEY not configured' },
        { status: 503 }
      )
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    const result = await executeCode(workspaceId, code)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Execute error:', error)
    return NextResponse.json(
      { error: 'Execution failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
