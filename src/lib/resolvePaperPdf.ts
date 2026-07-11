/**
 * Resolve a server-fetchable PDF for Living Page generation.
 * Prefer open / preprint sources; never claim OpenAthens cookies are available server-side.
 */

import type { PaperMetadata } from '@/lib/types'
import {
  parseInstitutionalEmail,
  resolveJournalAccess,
  viaOpenAthens,
  type InstitutionalContext,
} from '@/lib/institutional'

export type PdfAccessKind = 'open' | 'preprint' | 'institutional' | 'unavailable'

export type ResolvedPaperAccess = {
  paper: PaperMetadata
  pdfUrl?: string
  accessUrl?: string
  accessKind: PdfAccessKind
  reason: string
  fetchable: boolean
}

function arxivPdfFromId(id?: string | null) {
  if (!id) return null
  const match = String(id).match(/(?:arxiv:)?(\d{4}\.\d{4,5})(v\d+)?/i)
  if (!match) return null
  return `https://arxiv.org/pdf/${match[1]}${match[2] || ''}`
}

function looksLikePdfUrl(url?: string | null) {
  if (!url) return false
  const lower = url.toLowerCase()
  return (
    lower.includes('arxiv.org/pdf/') ||
    lower.includes('.pdf') ||
    lower.includes('openaccess') ||
    lower.includes('pmc/articles') ||
    lower.includes('biorxiv.org/content')
  )
}

async function urlLooksFetchable(url: string): Promise<boolean> {
  try {
    const head = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'User-Agent': 'ComboPapers/0.2 (research tool)' },
      signal: AbortSignal.timeout(8000),
    })
    if (head.ok) {
      const type = head.headers.get('content-type') || ''
      if (type.includes('pdf') || type.includes('octet-stream') || looksLikePdfUrl(url)) return true
    }
  } catch {
    // Some hosts reject HEAD; try a ranged GET.
  }

  try {
    const get = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'ComboPapers/0.2 (research tool)',
        Range: 'bytes=0-1023',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!get.ok && get.status !== 206) return false
    const type = get.headers.get('content-type') || ''
    if (type.includes('pdf') || type.includes('octet-stream')) return true
    // arXiv sometimes returns HTML wrappers without pdf content-type on range — still try known pdf urls
    return looksLikePdfUrl(url)
  } catch {
    return false
  }
}

export async function resolvePaperAccess(
  paper: PaperMetadata,
  email?: string | null
): Promise<ResolvedPaperAccess> {
  const ctx: InstitutionalContext | null = parseInstitutionalEmail(email)
  const candidates: Array<{ url: string; kind: PdfAccessKind; reason: string }> = []

  const arxivPdf =
    arxivPdfFromId(paper.arxivId) ||
    arxivPdfFromId(paper.id) ||
    (paper.pdfUrl && paper.pdfUrl.includes('arxiv.org') ? paper.pdfUrl : null)
  if (arxivPdf) {
    candidates.push({ url: arxivPdf, kind: 'preprint', reason: 'arXiv PDF' })
  }

  if (paper.pdfUrl && !candidates.some((c) => c.url === paper.pdfUrl)) {
    candidates.push({
      url: paper.pdfUrl,
      kind: looksLikePdfUrl(paper.pdfUrl) ? 'open' : 'open',
      reason: 'Listed PDF URL',
    })
  }

  if (paper.doi) {
    try {
      const unpaywallCtx =
        ctx ||
        parseInstitutionalEmail(email || process.env.INSTITUTIONAL_EMAIL || 'combo@papers.local')
      if (unpaywallCtx) {
        const resolved = await resolveJournalAccess(paper.doi, unpaywallCtx)
        if (resolved?.pdfUrl && !resolved.pdfUrl.includes('openathens')) {
          candidates.push({
            url: resolved.pdfUrl,
            kind: 'open',
            reason: 'Unpaywall open PDF',
          })
        }
        if (resolved?.accessUrl && ctx?.openAthensDomain && !candidates.length) {
          return {
            paper: {
              ...paper,
              pdfUrl: paper.pdfUrl || '',
              sourceUrl: resolved.accessUrl,
              url: resolved.accessUrl,
            },
            accessUrl: resolved.accessUrl,
            accessKind: 'institutional',
            reason: 'OpenAthens / publisher link (CruzID required for server import)',
            fetchable: false,
          }
        }
      }
    } catch {
      // continue with other candidates
    }
  }

  for (const candidate of candidates) {
    const ok = await urlLooksFetchable(candidate.url)
    if (ok) {
      return {
        paper: {
          ...paper,
          pdfUrl: candidate.url,
          sourceUrl: paper.sourceUrl || paper.url || candidate.url,
        },
        pdfUrl: candidate.url,
        accessUrl:
          paper.doi && ctx?.openAthensDomain
            ? viaOpenAthens(`https://doi.org/${paper.doi}`, ctx)
            : paper.sourceUrl || paper.url,
        accessKind: candidate.kind,
        reason: candidate.reason,
        fetchable: true,
      }
    }
  }

  const accessUrl =
    paper.doi && ctx?.openAthensDomain
      ? viaOpenAthens(`https://doi.org/${paper.doi}`, ctx)
      : paper.sourceUrl || paper.url || paper.pdfUrl

  return {
    paper: {
      ...paper,
      sourceUrl: accessUrl || paper.sourceUrl,
      url: accessUrl || paper.url,
    },
    accessUrl,
    accessKind: accessUrl?.includes('openathens') ? 'institutional' : 'unavailable',
    reason: accessUrl?.includes('openathens')
      ? 'Needs OpenAthens / CruzID before PDF can be imported'
      : 'No server-fetchable PDF found',
    fetchable: false,
  }
}

export async function resolvePapersForPath(
  papers: PaperMetadata[],
  options?: { email?: string | null; maxFetchable?: number }
) {
  const maxFetchable = options?.maxFetchable ?? 5
  const settled = await Promise.all(
    papers.map(async (paper) => resolvePaperAccess(paper, options?.email))
  )

  const fetchable = settled.filter((item) => item.fetchable)
  const institutional = settled.filter((item) => item.accessKind === 'institutional' && !item.fetchable)
  const unavailable = settled.filter(
    (item) => item.accessKind === 'unavailable' || (!item.fetchable && item.accessKind !== 'institutional')
  )

  return {
    fetchable: fetchable.slice(0, maxFetchable),
    institutionalQueue: institutional,
    unavailable,
    all: settled,
  }
}
