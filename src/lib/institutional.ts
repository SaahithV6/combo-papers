/**
 * UCSC / institutional library access.
 *
 * Reality check (2025+): UCSC retired oca.ucsc.edu EZProxy. Off-campus full-text
 * goes through OpenAthens + CruzID SSO. An @ucsc.edu email alone cannot silently
 * download paywalled PDFs or ebooks — the learner (or a browser agent with their
 * session) must authenticate once via OpenAthens.
 *
 * What we CAN automate without SSO:
 *  - Discover books + articles via UC Library Search deep links / Unpaywall OA
 *  - Mint OpenAthens redirector URLs that unlock full text after CruzID login
 *  - Prefer publisher / library holdings over arXiv preprints in ranking
 */

import { PaperMetadata } from './types'

const KNOWN_EDU_SUFFIXES = ['.edu', '.ac.uk', '.edu.au', '.ac.jp', '.edu.sg']

export type AccessTier = 'open' | 'institutional' | 'paywalled' | 'unknown'

export type LibraryMaterialKind = 'article' | 'book' | 'ebook' | 'chapter' | 'unknown'

export interface InstitutionalContext {
  email: string
  domain: string
  isInstitutional: boolean
  /** OpenAthens org domain, e.g. ucsc.edu */
  openAthensDomain?: string
  /** Legacy EZProxy base — unused at UCSC after Dec 2024 */
  proxyBaseUrl?: string
}

export interface LibraryHit {
  id: string
  title: string
  authors: string[]
  year?: number
  kind: LibraryMaterialKind
  venue?: string
  doi?: string
  isbn?: string
  /** Permalink into UC Library Search (Primo) */
  catalogUrl: string
  /** OpenAthens-wrapped publisher / DOI URL when known */
  accessUrl?: string
  sourceName: 'UC Library Search' | 'Unpaywall' | 'OpenAlex'
  relevanceReason: string
}

export function parseInstitutionalEmail(email?: string | null): InstitutionalContext | null {
  if (!email || !email.includes('@')) return null
  const domain = email.split('@')[1]?.toLowerCase() || ''
  const isInstitutional =
    KNOWN_EDU_SUFFIXES.some((s) => domain.endsWith(s)) ||
    Boolean(process.env.INSTITUTION_DOMAIN && domain === process.env.INSTITUTION_DOMAIN.toLowerCase())

  const openAthensDomain =
    process.env.OPENATHENS_DOMAIN ||
    (domain === 'ucsc.edu' ? 'ucsc.edu' : undefined)

  return {
    email,
    domain,
    isInstitutional,
    openAthensDomain,
    proxyBaseUrl: process.env.LIBRARY_PROXY_BASE_URL || undefined,
  }
}

/** OpenAthens redirector — user completes CruzID once, then lands on full text. */
export function viaOpenAthens(targetUrl: string, ctx?: InstitutionalContext | null): string {
  const org = ctx?.openAthensDomain || process.env.OPENATHENS_DOMAIN
  if (!org || !targetUrl) return targetUrl
  return `https://go.openathens.net/redirector/${org}?url=${encodeURIComponent(targetUrl)}`
}

/** @deprecated UCSC retired EZProxy; prefer viaOpenAthens */
export function viaLibraryProxy(url: string, ctx?: InstitutionalContext | null): string {
  if (ctx?.openAthensDomain || process.env.OPENATHENS_DOMAIN) {
    return viaOpenAthens(url, ctx)
  }
  if (!ctx?.isInstitutional || !ctx.proxyBaseUrl) return url
  const base = ctx.proxyBaseUrl.replace(/\/$/, '')
  return `${base}${encodeURIComponent(url)}`
}

/** Deep link into UC Library Search (Primo VE) for books + articles + more. */
export function ucLibrarySearchUrl(query: string, opts?: { booksOnly?: boolean; articlesOnly?: boolean }) {
  const vid = process.env.UCSC_PRIMO_VID || '01CDL_SCR_INST:USCS'
  const q = encodeURIComponent(query)
  let url = `https://ucsc.primo.exlibrisgroup.com/discovery/search?vid=${encodeURIComponent(vid)}&query=any,contains,${q}&tab=Everything&search_scope=MyInst_and_CI`
  if (opts?.booksOnly) {
    url += '&facet=rtype,include,books'
  }
  if (opts?.articlesOnly) {
    url += '&facet=rtype,include,articles'
  }
  return url
}

export function doiResolverUrl(doi: string) {
  return `https://doi.org/${doi.replace(/^doi:/i, '')}`
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
 * Resolve access for a DOI:
 * 1) Unpaywall OA PDF if any
 * 2) Else OpenAthens → publisher DOI (UCSC holdings after CruzID)
 */
export async function resolveJournalAccess(
  doi: string,
  ctx: InstitutionalContext
): Promise<{ pdfUrl?: string; accessUrl?: string; journal?: string; tier: AccessTier; version?: string } | null> {
  const email = encodeURIComponent(ctx.email)
  const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${email}`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ComboPapers-Agent/1.0 (education-hackathon)' },
    })
    if (!res.ok) {
      return {
        tier: 'institutional',
        accessUrl: viaOpenAthens(doiResolverUrl(doi), ctx),
        version: 'publisher',
      }
    }
    const data = (await res.json()) as UnpaywallHit

    const locations = [
      data.best_oa_location,
      ...(data.oa_locations || []),
    ].filter(Boolean) as NonNullable<UnpaywallHit['best_oa_location']>[]

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
    const athens = viaOpenAthens(doiResolverUrl(doi), ctx)

    if (!pdf) {
      return {
        tier: ctx.isInstitutional ? 'institutional' : 'paywalled',
        journal: data.journal_name,
        accessUrl: athens,
        version: 'publisher',
      }
    }

    return {
      pdfUrl: data.is_oa ? pdf : viaOpenAthens(pdf, ctx),
      accessUrl: athens,
      journal: data.journal_name,
      tier: data.is_oa ? 'open' : 'institutional',
      version: best?.version,
    }
  } catch (e) {
    console.error('Unpaywall resolve failed', e)
    return {
      tier: 'institutional',
      accessUrl: viaOpenAthens(doiResolverUrl(doi), ctx),
    }
  }
}

/**
 * Build library-facing hits (articles + books) for a research query.
 * Discovery is public; full-text for closed content requires OpenAthens click-through.
 */
export function buildLibraryDiscoveryPlan(query: string, ctx?: InstitutionalContext | null): {
  articlesSearchUrl: string
  booksSearchUrl: string
  everythingSearchUrl: string
  openAthensHome?: string
  note: string
} {
  return {
    articlesSearchUrl: ucLibrarySearchUrl(query, { articlesOnly: true }),
    booksSearchUrl: ucLibrarySearchUrl(query, { booksOnly: true }),
    everythingSearchUrl: ucLibrarySearchUrl(query),
    openAthensHome: ctx?.openAthensDomain
      ? `https://go.openathens.net/redirector/${ctx.openAthensDomain}?url=${encodeURIComponent('https://www.jstor.org/')}`
      : undefined,
    note: ctx?.isInstitutional
      ? `Signed in as ${ctx.email}. Closed full-text (IEEE, ACM, Springer, Safari/O'Reilly ebooks, etc.) opens via OpenAthens + CruzID — not via email alone.`
      : 'Sign in with your institutional email, then use OpenAthens links for full UCSC Library holdings.',
  }
}

/** Prefer journal / publisher / DOI sources when institutional access is available. */
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
