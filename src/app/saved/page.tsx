'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { safeEncodeId } from '@/lib/urlUtils'

interface SavedPaper {
  id: string
  title: string
  authors: string[]
  pdfFileId: string
  savedAt: number
}

export default function SavedPapersPage() {
  const router = useRouter()
  const [papers, setPapers] = useState<SavedPaper[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/papers/saved')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load saved papers')
        const data = await res.json() as { papers: SavedPaper[] }
        setPapers(data.papers)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/papers/${safeEncodeId(id)}/pdf`, { method: 'DELETE' })
      if (res.ok) {
        setPapers((prev) => prev.filter((p) => p.id !== id))
      } else {
        setDeleteError('Failed to delete PDF')
      }
    } catch {
      setDeleteError('Failed to delete PDF')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm text-text-muted transition-all"
          >
            ← Back to search
          </button>
        </div>

        <h1
          className="text-3xl font-bold mb-2 text-text"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          📚 Saved Papers
        </h1>
        <p className="text-sm text-text-muted mb-8">
          PDF snapshots of Living Pages stored in MongoDB
        </p>

        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin text-3xl mb-3">⟳</div>
            <p className="text-text-muted text-sm">Loading saved papers...</p>
          </div>
        )}

        {error && (
          <div className="py-8 text-center">
            <p className="text-amber text-sm">{error}</p>
          </div>
        )}

        {deleteError && (
          <div className="mb-4 px-3 py-2 rounded border border-red-900/40 bg-red-900/10 text-xs text-red-400">
            {deleteError}
          </div>
        )}

        {!isLoading && !error && papers.length === 0 && (
          <div className="py-16 text-center border border-surface-2 rounded-xl bg-surface">
            <p className="text-4xl mb-4">📄</p>
            <p className="text-text text-lg mb-2">No saved PDFs yet</p>
            <p className="text-text-muted text-sm mb-6">
              Open any paper and click &ldquo;Save PDF&rdquo; to snapshot it here.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 rounded bg-teal text-background text-sm"
            >
              Browse papers →
            </button>
          </div>
        )}

        {!isLoading && papers.length > 0 && (
          <div className="space-y-3">
            {papers.map((paper) => (
              <div
                key={paper.id}
                className="p-4 rounded-xl border border-surface-2 bg-surface flex flex-col gap-3"
              >
                <div>
                  <p className="text-text font-medium leading-snug">{paper.title}</p>
                  {paper.authors.length > 0 && (
                    <p className="text-xs text-text-muted mt-0.5">
                      {paper.authors.slice(0, 3).join(', ')}
                      {paper.authors.length > 3 ? ' et al.' : ''}
                    </p>
                  )}
                  {paper.savedAt > 0 && (
                    <p className="text-xs text-text-muted mt-0.5">
                      Saved {new Date(paper.savedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={`/api/papers/${safeEncodeId(paper.id)}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded bg-teal text-background"
                  >
                    View PDF ↗
                  </a>
                  <button
                    onClick={() => router.push(`/paper/${safeEncodeId(paper.id)}`)}
                    className="text-xs px-3 py-1.5 rounded border border-surface-2 text-text-muted bg-background"
                  >
                    Open Paper
                  </button>
                  <button
                    onClick={() => handleDelete(paper.id)}
                    disabled={deletingId === paper.id}
                    className="text-xs px-3 py-1.5 rounded border border-red-900/40 text-red-400 bg-background disabled:opacity-50 ml-auto"
                  >
                    {deletingId === paper.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
