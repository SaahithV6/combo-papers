import { NextRequest, NextResponse } from 'next/server'
import { extractPdf } from '@/lib/extractPdf'
import { parsePaperFromText } from '@/lib/parsePaper'
import { generateNotebook } from '@/lib/generateNotebook'
import { extractVariables } from '@/lib/extractVariables'
import { storeInSupermemory } from '@/lib/supermemory'
import { withSpan } from '@/lib/laminar'
import { Section } from '@/lib/types'
import demoData from '@/data/demo-fallback.json'
import { getButterbaseAdmin } from '@/lib/butterbase'
import { checkRateLimit } from '@/lib/rateLimit'

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
    const { title, authors, pdfUrl, sourceUrl, sourceName } = paperData
    const paperId = paperData.paperId || paperData.id

    // Deterministic, zero-credit path for the guided demo.
    const demoPaper = demoData.papers.find(
      (candidate) => candidate.id === paperId || candidate.title === title
    )
    if (demoPaper) {
      return NextResponse.json({
        paperId: demoPaper.id,
        status: 'ready',
        paper: demoPaper,
        source: 'bundled-demo',
      })
    }

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

    // Butterbase is the canonical durable record; Mongo remains a compatibility fallback.
    if (paperId) {
      const admin = getButterbaseAdmin()
      if (admin) {
        try {
          const record = {
            external_id: paperId,
            arxiv_id: typeof paperId === 'string' && paperId.startsWith('arxiv:') ? paperId.slice(6) : null,
            doi: paperData.doi || null,
            title,
            authors: authors || [],
            venue: paperData.venue || null,
            year: paperData.year || null,
            pdf_url: pdfUrl,
            source_url: sourceUrl || pdfUrl,
            source_name: sourceName || 'arXiv',
            access_tier: paperData.accessTier || 'open',
            relevance_score: paperData.relevanceScore || 0,
            relevance_reason: paperData.relevanceReason || null,
            status: 'ready',
            processed: paper,
            github_url: parsed.githubUrl || null,
            notebook_cells: notebookCells,
            updated_at: new Date().toISOString(),
          }
          const { data: existing } = await admin
            .from('papers')
            .select('id')
            .eq('external_id', paperId)
            .limit(1)
          const row = Array.isArray(existing) ? existing[0] : existing
          if (row && typeof row === 'object' && 'id' in row) {
            await admin.from('papers').update(record).eq('id', String(row.id))
          } else {
            await admin.from('papers').insert(record)
          }
        } catch (error) {
          console.warn('Butterbase paper persist failed:', error)
        }
      }
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

