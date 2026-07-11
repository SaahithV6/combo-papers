/**
 * Institutional journal access.
 *
 * When a learner signs in with an institutional email, we prefer peer-reviewed
 * journal versions over arXiv preprints via Unpaywall + optional library proxy.
 */

import { PaperMetadata } from './types'

const KNOWN_EDU_SUFFIXES = ['.edu', '.ac.uk', '.edu.au', '.ac.jp', '.edu.sg']

export type AccessTier = 'open' | 'institutional' | 'paywalled' | 'unknown'

export interface InstitutionalContext {
  email: string
  domain: string
  isInstitutional: boolean
  proxyBaseUrl?: string
}

export function parseInstitutionalEmail(email?: string | null): InstitutionalContext | null {
  if (!email || !email.includes('@')) return null
  const domain = email.split('@')[1]?.toLowerCase() || ''
  const isInstitutional =
    KNOWN_EDU_SUFFIXES.some((s) => domain.endsWith(s)) ||
    Boolean(process.env.INSTITUTION_DOMAIN && domain === process.env.INSTITUTION_DOMAIN.toLowerCase())

  return {
    email,
    domain,
    isInstitutional,
    proxyBaseUrl: process.env.LIBRARY_PROXY_BASE_URL || undefined,
  }
}

export function viaLibraryProxy(url: string, ctx?: InstitutionalContext | null): string {
  if (!ctx?.isInstitutional || !ctx.proxyBaseUrl) return url
  // EZProxy-style: https://proxy.library.edu/login?url=<target>
  const base = ctx.proxyBaseUrl.replace(/\/$/, '')
  return `${base}${encodeURIComponent(url)}`
}

interface UnpaywallHit {
  doi: string
  is_oa: boolean
  journal_name?: string
  published_date?: string
  best_oa_location?: {
    url_for_pdf?: string
    url?: string
    version?: string
    host_type?: string
  } | null
  oa_locations?: Array<{
    url_for_pdf?: string
    url?: string
    version?: string
    host_type?: string
  }>
}

/**
 * Resolve a journal PDF via Unpaywall using the learner's institutional email
 * (Unpaywall requires a contact email; institutional emails improve compliance).
 */
export async function resolveJournalAccess(
  doi: string,
  ctx: InstitutionalContext
): Promise<{ pdfUrl?: string; journal?: string; tier: AccessTier; version?: string } | null> {
  const email = encodeURIComponent(ctx.email)
  const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${email}`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ComboPapers-Agent/1.0 (education-hackathon)' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as UnpaywallHit

    const locations = [
      data.best_oa_location,
      ...(data.oa_locations || []),
    ].filter(Boolean) as NonNullable<UnpaywallHit['best_oa_location']>[]

    // Prefer published version / journal host over preprint
    const ranked = [...locations].sort((a, b) => {
      const score = (loc: typeof a) => {
        let s = 0
        if (loc?.version === 'publishedVersion') s += 3
        if (loc?.host_type === 'publisher') s += 2
        if (loc?.url_for_pdf) s += 1
        return s
      }
      return score(b) - score(a)
    })

    const best = ranked[0]
    const pdf = best?.url_for_pdf || best?.url
    if (!pdf) {
      // Institutional proxy may still unlock publisher HTML
      if (ctx.proxyBaseUrl && doi) {
        return {
          tier: 'institutional',
          journal: data.journal_name,
          pdfUrl: viaLibraryProxy(`https://doi.org/${doi}`, ctx),
          version: 'publisher',
        }
      }
      return { tier: 'paywalled', journal: data.journal_name }
    }

    return {
      pdfUrl: viaLibraryProxy(pdf, ctx),
      journal: data.journal_name,
      tier: data.is_oa ? 'open' : 'institutional',
      version: best?.version,
    }
  } catch (e) {
    console.error('Unpaywall resolve failed', e)
    return null
  }
}

/** Prefer journal / publisher sources when institutional access is available. */
export function rankForInstitutionalAccess(
  papers: PaperMetadata[],
  ctx?: InstitutionalContext | null
): PaperMetadata[] {
  if (!ctx?.isInstitutional) return papers

  const journalBoost = (p: PaperMetadata) => {
    let boost = 0
    const venue = (p.venue || '').toLowerCase()
    const source = (p.sourceName || '').toLowerCase()
    if (p.doi) boost += 0.15
    if (source.includes('pubmed') || source.includes('openalex') || source.includes('doaj')) boost += 0.1
    if (venue && !venue.includes('arxiv') && !venue.includes('biorxiv')) boost += 0.1
    if (source.includes('arxiv') || source.includes('biorxiv')) boost -= 0.05
    return boost
  }

  return [...papers].sort((a, b) => {
    const scoreA = (a.relevanceScore || 0) + journalBoost(a)
    const scoreB = (b.relevanceScore || 0) + journalBoost(b)
    return scoreB - scoreA
  })
}
