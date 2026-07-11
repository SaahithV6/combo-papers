import { NextRequest, NextResponse } from 'next/server'
import { extractPdf } from '@/lib/extractPdf'
import { parsePaperFromText } from '@/lib/parsePaper'
import { generateNotebook } from '@/lib/generateNotebook'
import { extractVariables } from '@/lib/extractVariables'
import { storeInSupermemory } from '@/lib/supermemory'
import { withSpan } from '@/lib/laminar'
import { Section } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  return withSpan('process_paper', async () => {
  try {
    const body = await request.json()
    const paperData = body.paper || body
    const { title, authors, pdfUrl, sourceUrl, sourceName } = paperData
    const paperId = paperData.paperId || paperData.id

    if (!pdfUrl || !title) {
      return NextResponse.json({ error: 'pdfUrl and title are required' }, { status: 400 })
    }

    // Stage 1: Extract PDF text
    let pdfText = ''
    try {
      pdfText = await withSpan('extract_pdf', () => extractPdf(pdfUrl))
    } catch (err) {
      console.warn('PDF extraction failed, proceeding with empty text:', err)
    }

    // Stage 2: Parse with Claude
    const parsed = await withSpan('parse_paper', () =>
      parsePaperFromText(title, authors || [], pdfText, sourceUrl || pdfUrl)
    )

    // Stage 3 & 4: Extract variables and generate notebook in parallel
    let variables = parsed.variables || []
    let notationWarnings = parsed.notationWarnings || []
    let notebookCells = parsed.notebookCells || []

    if (parsed.sections && parsed.sections.length > 0) {
      const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
        new Promise<T>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Timeout')), ms)
          promise.then(
            val => { clearTimeout(timer); resolve(val) },
            err => { clearTimeout(timer); reject(err) }
          )
        })

      const [variablesResult, notebookResult] = await Promise.allSettled([
        withTimeout(withSpan('extract_variables', () => extractVariables(parsed.sections as Section[])), 30000),
        withTimeout(withSpan('generate_notebook', () => generateNotebook(title, parsed.sections as Section[], parsed.githubUrl)), 30000),
      ])

      if (variablesResult.status === 'fulfilled') {
        if (variablesResult.value.variables.length > 0) variables = variablesResult.value.variables
        if (variablesResult.value.notationWarnings.length > 0) notationWarnings = variablesResult.value.notationWarnings
      } else {
        console.warn('Variable extraction failed:', variablesResult.reason)
      }

      if (notebookResult.status === 'fulfilled') {
        if (notebookResult.value.length > 0) notebookCells = notebookResult.value
      } else {
        console.warn('Notebook generation failed:', notebookResult.reason)
      }
    }

    const paper = {
      id: paperId,
      status: 'ready' as const,
      title,
      authors: authors || [],
      pdfUrl,
      sourceUrl: sourceUrl || pdfUrl,
      sourceName: sourceName || 'arXiv',
      ...parsed,
      variables,
      notationWarnings,
      notebookCells,
    }

    // Store in Supermemory for future prerequisite lookups
    if (pdfText) {
      storeInSupermemory(
        `${title}\n\n${pdfText.substring(0, 2000)}`,
        { title, sourceUrl: sourceUrl || pdfUrl, paperId }
      ).catch(err => console.warn('Supermemory store failed:', err))
    }

    // Persist to MongoDB (non-blocking)
    if (paperId) {
      import('@/lib/mongodb')
        .then(async ({ getDb }) => {
          const db = await getDb()
          await db.collection('papers').updateOne(
            { id: paperId },
            { $set: { ...paper, updatedAt: Date.now() } },
            { upsert: true }
          )
        })
        .catch((e: unknown) => console.warn('MongoDB persist failed:', e))
    }

    return NextResponse.json({ paperId, status: 'ready', paper })
  } catch (error) {
    console.error('Processing error:', error)
    return NextResponse.json(
      { error: 'Processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
  })
}

