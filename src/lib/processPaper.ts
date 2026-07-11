import { extractPdf } from '@/lib/extractPdf'
import { parsePaperFromText } from '@/lib/parsePaper'
import { generateNotebook } from '@/lib/generateNotebook'
import { extractVariables } from '@/lib/extractVariables'
import { storeInSupermemory } from '@/lib/supermemory'
import { withSpan } from '@/lib/laminar'
import { Section, type PaperMetadata, type ProcessedPaper } from '@/lib/types'
import demoData from '@/data/demo-fallback.json'
import { getButterbaseAdmin } from '@/lib/butterbase'
import { resolvePaperAccess } from '@/lib/resolvePaperPdf'

type ProcessInput = PaperMetadata & {
  paperId?: string
  accessTier?: string
}

export async function processPaperPayload(paperData: ProcessInput): Promise<{
  paperId: string
  status: 'ready'
  paper: ProcessedPaper
  source?: string
}> {
  const title = paperData.title
  const authors = paperData.authors || []
  let pdfUrl = paperData.pdfUrl
  const sourceUrl = paperData.sourceUrl || paperData.url
  const sourceName = paperData.sourceName
  const paperId = paperData.paperId || paperData.id || `paper_${Date.now()}`

  const demoPaper = demoData.papers.find(
    (candidate) => candidate.id === paperId || candidate.title === title
  )
  if (demoPaper) {
    return {
      paperId: demoPaper.id,
      status: 'ready',
      paper: demoPaper as unknown as ProcessedPaper,
      source: 'bundled-demo',
    }
  }

  if (!title) {
    throw new Error('title is required')
  }

  if (!pdfUrl) {
    const resolved = await resolvePaperAccess(paperData)
    if (resolved.fetchable && resolved.pdfUrl) {
      pdfUrl = resolved.pdfUrl
    }
  }

  if (!pdfUrl) {
    throw new Error('No server-fetchable PDF URL available for this paper')
  }

  let pdfText = ''
  try {
    pdfText = await withSpan('extract_pdf', () => extractPdf(pdfUrl!))
  } catch (err) {
    console.warn('PDF extraction failed, proceeding with empty text:', err)
  }

  const parsed = await withSpan('parse_paper', () =>
    parsePaperFromText(title, authors, pdfText, sourceUrl || pdfUrl)
  )

  let variables = parsed.variables || []
  let notationWarnings = parsed.notationWarnings || []
  let notebookCells = parsed.notebookCells || []

  if (parsed.sections && parsed.sections.length > 0) {
    const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout')), ms)
        promise.then(
          (val) => {
            clearTimeout(timer)
            resolve(val)
          },
          (err) => {
            clearTimeout(timer)
            reject(err)
          }
        )
      })

    const [variablesResult, notebookResult] = await Promise.allSettled([
      withTimeout(
        withSpan('extract_variables', () => extractVariables(parsed.sections as Section[])),
        30000
      ),
      withTimeout(
        withSpan('generate_notebook', () =>
          generateNotebook(title, parsed.sections as Section[], parsed.githubUrl)
        ),
        30000
      ),
    ])

    if (variablesResult.status === 'fulfilled') {
      if (variablesResult.value.variables.length > 0) variables = variablesResult.value.variables
      if (variablesResult.value.notationWarnings.length > 0) {
        notationWarnings = variablesResult.value.notationWarnings
      }
    }

    if (notebookResult.status === 'fulfilled' && notebookResult.value.length > 0) {
      notebookCells = notebookResult.value
    }
  }

  const paper = {
    id: paperId,
    status: 'ready' as const,
    title,
    authors,
    pdfUrl,
    sourceUrl: sourceUrl || pdfUrl,
    sourceName: sourceName || 'arXiv',
    ...parsed,
    variables,
    notationWarnings,
    notebookCells,
  } as ProcessedPaper

  const admin = getButterbaseAdmin()
  if (admin && paperId) {
    try {
      const record = {
        external_id: paperId,
        arxiv_id:
          typeof paperId === 'string' && paperId.startsWith('arxiv:') ? paperId.slice(6) : null,
        doi: paperData.doi || null,
        title,
        authors,
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

  if (pdfText) {
    storeInSupermemory(`${title}\n\n${pdfText.substring(0, 2000)}`, {
      title,
      sourceUrl: sourceUrl || pdfUrl,
      paperId,
    }).catch((err) => console.warn('Supermemory store failed:', err))
  }

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

  return { paperId, status: 'ready', paper }
}
