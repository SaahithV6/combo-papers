#!/usr/bin/env python3
"""
Browser Use automation agent for academic article discovery.

Usage:
    python browser_use_agent.py --query "transformer attention mechanism" [--max-results 20]

Output: JSON array of discovered articles to stdout, errors/logs to stderr.
"""

import argparse
import json
import os
import sys
import time
import re
from pathlib import Path
from typing import Optional
import urllib.request
import urllib.parse
import urllib.error
import xml.etree.ElementTree as ET

try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env.local"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass  # dotenv not installed, rely on environment variables


def log(msg: str) -> None:
    """Write to stderr so stdout stays clean JSON."""
    print(msg, file=sys.stderr)


# ---------------------------------------------------------------------------
# Source scrapers
# ---------------------------------------------------------------------------

def search_arxiv(query: str, max_results: int = 10) -> list[dict]:
    """Search arXiv using the public Atom API (no auth needed)."""
    articles = []
    try:
        encoded = urllib.parse.quote(query)
        url = (
            f"https://export.arxiv.org/api/query"
            f"?search_query=all:{encoded}&start=0&max_results={max_results}"
            f"&sortBy=relevance&sortOrder=descending"
        )
        log(f"[arXiv] fetching: {url}")
        req = urllib.request.Request(url, headers={"User-Agent": "BrowserUseAgent/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8")

        ns = {
            "atom": "http://www.w3.org/2005/Atom",
            "arxiv": "http://arxiv.org/schemas/atom",
        }
        root = ET.fromstring(body)
        for entry in root.findall("atom:entry", ns):
            title_el = entry.find("atom:title", ns)
            abstract_el = entry.find("atom:summary", ns)
            id_el = entry.find("atom:id", ns)
            authors = [
                a.find("atom:name", ns).text or ""
                for a in entry.findall("atom:author", ns)
                if a.find("atom:name", ns) is not None
            ]
            published_el = entry.find("atom:published", ns)

            if title_el is None or id_el is None:
                continue

            arxiv_url = (id_el.text or "").strip()
            arxiv_id = arxiv_url.split("/abs/")[-1] if "/abs/" in arxiv_url else ""
            pdf_url = arxiv_url.replace("/abs/", "/pdf/") + ".pdf" if arxiv_id else ""

            articles.append({
                "source": "arXiv",
                "title": (title_el.text or "").strip().replace("\n", " "),
                "abstract": (abstract_el.text or "").strip().replace("\n", " ") if abstract_el is not None else "",
                "authors": authors[:5],
                "url": arxiv_url,
                "pdf_url": pdf_url,
                "arxiv_id": arxiv_id,
                "year": (published_el.text or "")[:4] if published_el is not None else "",
                "citation_count": None,
            })
    except Exception as exc:
        log(f"[arXiv] error: {exc}")

    return articles


def search_semantic_scholar(query: str, max_results: int = 10) -> list[dict]:
    """Search Semantic Scholar public API (no auth needed, rate-limited)."""
    articles = []
    try:
        encoded = urllib.parse.quote(query)
        url = (
            f"https://api.semanticscholar.org/graph/v1/paper/search"
            f"?query={encoded}&limit={max_results}"
            f"&fields=title,abstract,authors,year,externalIds,openAccessPdf,citationCount,url"
        )
        log(f"[SemanticScholar] fetching: {url}")
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "BrowserUseAgent/1.0",
                "Accept": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        for paper in data.get("data", []):
            ext_ids = paper.get("externalIds") or {}
            arxiv_id = ext_ids.get("ArXiv", "")
            pdf_info = paper.get("openAccessPdf") or {}
            pdf_url = pdf_info.get("url", "")
            if not pdf_url and arxiv_id:
                pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"

            articles.append({
                "source": "Semantic Scholar",
                "title": paper.get("title", ""),
                "abstract": paper.get("abstract", "") or "",
                "authors": [a.get("name", "") for a in (paper.get("authors") or [])[:5]],
                "url": paper.get("url") or f"https://www.semanticscholar.org/paper/{paper.get('paperId','')}",
                "pdf_url": pdf_url,
                "arxiv_id": arxiv_id,
                "year": str(paper.get("year") or ""),
                "citation_count": paper.get("citationCount"),
            })
        # Respect rate limits
        time.sleep(1)
    except Exception as exc:
        log(f"[SemanticScholar] error: {exc}")

    return articles


def search_pubmed(query: str, max_results: int = 5) -> list[dict]:
    """Search PubMed using the E-utilities API (no auth needed)."""
    articles = []
    try:
        encoded = urllib.parse.quote(query)
        search_url = (
            f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
            f"?db=pubmed&term={encoded}&retmax={max_results}&retmode=json"
        )
        log(f"[PubMed] searching: {search_url}")
        req = urllib.request.Request(search_url, headers={"User-Agent": "BrowserUseAgent/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            search_data = json.loads(resp.read().decode("utf-8"))

        ids = search_data.get("esearchresult", {}).get("idlist", [])
        if not ids:
            return articles

        fetch_url = (
            f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
            f"?db=pubmed&id={','.join(ids)}&retmode=json"
        )
        log(f"[PubMed] fetching summaries")
        req2 = urllib.request.Request(fetch_url, headers={"User-Agent": "BrowserUseAgent/1.0"})
        with urllib.request.urlopen(req2, timeout=15) as resp2:
            summary_data = json.loads(resp2.read().decode("utf-8"))

        for pmid in ids:
            doc = summary_data.get("result", {}).get(pmid, {})
            if not doc:
                continue
            title = doc.get("title", "")
            authors = [a.get("name", "") for a in (doc.get("authors") or [])[:5]]
            pub_date = doc.get("pubdate", "")
            year = pub_date[:4] if pub_date else ""
            articles.append({
                "source": "PubMed",
                "title": title,
                "abstract": "",
                "authors": authors,
                "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                "pdf_url": "",
                "arxiv_id": "",
                "year": year,
                "citation_count": None,
            })
        time.sleep(0.5)
    except Exception as exc:
        log(f"[PubMed] error: {exc}")

    return articles


def search_browser_use_cloud(query: str, max_results: int) -> Optional[list[dict]]:
    """
    Use the Browser Use Cloud SDK to search the web for books and resources.
    Requires BROWSER_USE_API_KEY in the environment.
    """
    api_key = os.environ.get("BROWSER_USE_API_KEY")
    if not api_key:
        log("[BrowserUseCloud] BROWSER_USE_API_KEY not set, skipping")
        return None

    try:
        from browser_use_sdk import AsyncBrowserUse  # type: ignore
        import asyncio

        async def run_cloud() -> list[dict]:
            client = AsyncBrowserUse(api_key=api_key)
            task = (
                f'Search the web for books and resources about: "{query}". '
                f'Visit sites like Google Books, Amazon Books, Goodreads, and general search. '
                f'For each result collect: title, authors, description/abstract, URL, year, and source name. '
                f'Return ONLY a JSON array with up to {max_results} items, each having fields: '
                f'title, authors (list), abstract, url, year, source.'
            )
            log(f"[BrowserUseCloud] running task for query: {query!r}")
            result = await client.run(task)
            text = result.output or ""
            match = re.search(r"\[[\s\S]*\]", text)
            if match:
                try:
                    return json.loads(match.group(0))
                except json.JSONDecodeError as e:
                    log(f"[BrowserUseCloud] JSON parse error: {e}")
            return []

        results = asyncio.run(run_cloud())
        mapped = []
        for r in results:
            mapped.append({
                "source": r.get("source") or "Browser Use Cloud",
                "title": r.get("title", ""),
                "abstract": r.get("abstract") or r.get("description", ""),
                "authors": r.get("authors") or [],
                "url": r.get("url", ""),
                "pdf_url": "",
                "arxiv_id": "",
                "year": str(r.get("year") or ""),
                "citation_count": None,
            })
        log(f"[BrowserUseCloud] got {len(mapped)} results")
        return mapped if mapped else None
    except ImportError:
        log("[BrowserUseCloud] browser-use-sdk not installed, skipping")
        return None
    except Exception as exc:
        log(f"[BrowserUseCloud] error (non-fatal): {exc}")
        return None


def try_browser_use(query: str, max_results: int) -> Optional[list[dict]]:
    """
    Attempt to use the browser-use library for richer scraping (Google Scholar etc.).
    Falls back gracefully if not installed or if a CAPTCHA is encountered.
    """
    try:
        from browser_use import Agent  # type: ignore
        import asyncio

        async def run_agent() -> list[dict]:
            agent = Agent(
                task=(
                    f'Search Google Scholar for academic papers about: "{query}". '
                    f'Return up to {max_results} results as a JSON array with fields: '
                    f'title, authors (list), abstract, url, pdf_url, year, citation_count. '
                    f'Output ONLY the JSON array, nothing else.'
                )
            )
            result = await agent.run()
            text = str(result)
            match = re.search(r"\[[\s\S]*\]", text)
            if match:
                return json.loads(match.group(0))
            return []

        results = asyncio.run(run_agent())
        for r in results:
            r.setdefault("source", "Google Scholar (Browser Use)")
        return results
    except ImportError:
        log("[BrowserUse] local library not installed, skipping fallback")
        return None
    except Exception as exc:
        log(f"[BrowserUse] error (non-fatal): {exc}")
        return None


def deduplicate(articles: list[dict]) -> list[dict]:
    """Remove duplicates by arxiv_id or normalised title."""
    seen_arxiv: set[str] = set()
    seen_title: set[str] = set()
    out = []
    for a in articles:
        aid = a.get("arxiv_id", "")
        title_key = re.sub(r"\s+", " ", a.get("title", "").lower().strip())
        if aid and aid in seen_arxiv:
            continue
        if title_key and title_key in seen_title:
            continue
        if aid:
            seen_arxiv.add(aid)
        if title_key:
            seen_title.add(title_key)
        out.append(a)
    return out


def discover_articles(query: str, max_results: int = 20) -> list[dict]:
    """Main entry point: search all sources and return deduplicated results."""
    per_source = max(5, max_results // 3)

    all_articles: list[dict] = []

    # Try Browser Use Cloud first (uses BROWSER_USE_API_KEY)
    cloud_results = search_browser_use_cloud(query, per_source)
    if cloud_results:
        all_articles.extend(cloud_results)
    else:
        # Fall back to local browser-use library
        bu_results = try_browser_use(query, per_source)
        if bu_results:
            all_articles.extend(bu_results)

    # Always hit the free APIs
    all_articles.extend(search_arxiv(query, per_source))
    all_articles.extend(search_semantic_scholar(query, per_source))
    all_articles.extend(search_pubmed(query, min(5, per_source)))

    deduped = deduplicate(all_articles)

    # Sort: prefer results with citation counts, then by year descending
    def sort_key(a: dict):
        cc = a.get("citation_count") or 0
        year = int(a.get("year") or 0)
        return (-cc, -year)

    deduped.sort(key=sort_key)
    return deduped[:max_results]


def main() -> None:
    parser = argparse.ArgumentParser(description="Discover academic articles")
    parser.add_argument("--query", required=True, help="Search query")
    parser.add_argument("--max-results", type=int, default=20)
    args = parser.parse_args()

    results = discover_articles(args.query, args.max_results)
    # Output clean JSON to stdout
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
