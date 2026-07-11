import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export const runtime = 'nodejs'
export const maxDuration = 120

export interface DiscoveredArticle {
  source: string
  title: string
  abstract: string
  authors: string[]
  url: string
  pdf_url: string
  arxiv_id: string
  year: string
  citation_count: number | null
}

export async function POST(request: NextRequest) {
  try {
    const { query, maxResults = 20 } = await request.json() as { query: string; maxResults?: number }

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    const scriptPath = path.join(process.cwd(), 'browser-use', 'browser_use_agent.py')

    const articles = await new Promise<DiscoveredArticle[]>((resolve, reject) => {
      const proc = spawn('python3', [
        scriptPath,
        '--query', query,
        '--max-results', String(maxResults),
      ], {
        timeout: 110_000,
        env: { ...process.env },
      })

      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
      proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

      proc.on('close', (code) => {
        if (stderr) console.warn('[browser-use stderr]', stderr.slice(-500))
        if (code !== 0 && !stdout) {
          reject(new Error(`Python exited with code ${code}: ${stderr.slice(0, 200)}`))
          return
        }
        try {
          const parsed = JSON.parse(stdout) as DiscoveredArticle[]
          resolve(parsed)
        } catch {
          reject(new Error('Failed to parse Python output as JSON'))
        }
      })

      proc.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new Error('Python not found. Please install Python 3 and browser-use dependencies.'))
        } else {
          reject(err)
        }
      })
    })

    return NextResponse.json({ articles, query })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('browser-use error:', message)
    return NextResponse.json(
      { error: 'Article discovery failed', details: message },
      { status: 500 }
    )
  }
}
