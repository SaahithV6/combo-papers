'use client'

import { useState, useEffect } from 'react'
import { ProcessedPaper, NotebookCell as NotebookCellType } from '@/lib/types'
import NotebookCell from './NotebookCell'
import { openInColab, downloadIpynb } from '@/lib/notebookExport'
import { playAction } from '@/hooks/useSoundscape'

interface NotebookEmbedProps {
  paper: ProcessedPaper
  isOpen: boolean
  onClose: () => void
  onCellRun?: () => void
}

interface NotebookData {
  cells: NotebookCellType[]
  sandboxUrl?: string
  daytonaWorkspaceId?: string
  colabUrl?: string
  status: string
}

export default function NotebookEmbed({ paper, isOpen, onClose, onCellRun }: NotebookEmbedProps) {
  const [notebook, setNotebook] = useState<NotebookData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [colabTip, setColabTip] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || notebook) return

    if (paper.notebookCells && paper.notebookCells.some((c) => c.type === 'code')) {
      setNotebook({ cells: paper.notebookCells, status: 'cells-only' })
      return
    }

    const createNotebook = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/notebook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paper, action: 'create' }),
        })
        if (response.ok) {
          const data = (await response.json()) as NotebookData
          setNotebook(data)
        }
      } catch (e) {
        console.error('Notebook error:', e)
      } finally {
        setIsLoading(false)
      }
    }

    void createNotebook()
  }, [isOpen, paper, notebook])

  if (!isOpen) return null

  const handleOpenColab = () => {
    if (!notebook?.cells?.length) return
    const { filename } = openInColab(paper.title, notebook.cells)
    playAction('notebook')
    setColabTip(
      `Downloaded ${filename}. In the Colab tab: File → Upload notebook → pick that file. No OAuth required in Combo Papers.`
    )
  }

  return (
    <div
      className="fixed bottom-0 right-0 top-[var(--app-header)] z-[80] flex w-full flex-col animate-slide-in-right border-l shadow-2xl sm:w-[min(520px,100vw)]"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-2">
        <div>
          <p className="text-xs font-display uppercase tracking-wider text-teal">Notebook</p>
          <p className="text-xs mt-0.5 text-text-muted" style={{ maxWidth: '300px' }} title={paper.title}>
            {paper.title.substring(0, 50)}
            {paper.title.length > 50 ? '...' : ''}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded text-text-muted bg-surface-2"
        >
          ×
        </button>
      </div>

      {colabTip && (
        <div
          className="px-4 py-2 text-xs border-b border-surface-2"
          style={{ backgroundColor: '#111827', color: '#f5a623' }}
        >
          {colabTip}
          <button
            type="button"
            className="ml-2 underline"
            style={{ color: '#00d4aa' }}
            onClick={() => setColabTip(null)}
          >
            dismiss
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin text-2xl mb-2">⟳</div>
              <p className="text-xs text-text-muted">Generating notebook...</p>
            </div>
          </div>
        )}

        {!isLoading && notebook && (
          <div>
            {notebook.cells.map((cell) => {
              const section = (paper.sections || []).find((s) => s.id === cell.sectionId)
              return (
                <div key={cell.id} id={`nb-cell-${cell.id}`}>
                  {section && (
                    <div className="px-3 pt-2 pb-0">
                      <a
                        href={`#${section.id}`}
                        onClick={onClose}
                        className="text-xs text-teal/70 hover:text-teal hover:underline"
                      >
                        Also in paper §{section.title} ↗
                      </a>
                    </div>
                  )}
                  <NotebookCell
                    cell={cell}
                    onRun={() => {
                      playAction('notebook')
                      onCellRun?.()
                    }}
                  />
                </div>
              )
            })}
          </div>
        )}

        {!isLoading && !notebook && (
          <div className="flex items-center justify-center h-32">
            <p className="text-xs text-text-muted">Failed to load notebook</p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 text-xs border-t border-surface-2 text-text-muted space-y-2">
        <p style={{ color: '#00d4aa' }}>
          ⚡ Primary runtime: in-page Pyodide (numpy / matplotlib / scipy / pandas / sklearn)
        </p>
        <div className="flex gap-3 flex-wrap">
          {notebook?.cells && (
            <button
              type="button"
              className="underline"
              style={{ color: '#00d4aa' }}
              onClick={() => downloadIpynb(paper.title, notebook.cells)}
            >
              Download .ipynb
            </button>
          )}
          {notebook?.cells && (
            <button
              type="button"
              className="underline font-medium"
              style={{ color: '#f5a623' }}
              onClick={handleOpenColab}
            >
              Open in Colab ↗
            </button>
          )}
        </div>
        <p style={{ color: '#6b7280' }}>
          Colab can&apos;t be embedded. Open in Colab downloads the notebook and opens a blank Colab —
          then File → Upload notebook. No Google OAuth setup required for that path.
        </p>
      </div>
    </div>
  )
}
