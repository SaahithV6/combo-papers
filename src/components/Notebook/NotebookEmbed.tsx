'use client'

import { useState, useEffect } from 'react'
import { ProcessedPaper, NotebookCell as NotebookCellType } from '@/lib/types'
import NotebookCell from './NotebookCell'

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
  status: string
}

export default function NotebookEmbed({ paper, isOpen, onClose, onCellRun }: NotebookEmbedProps) {
  const [notebook, setNotebook] = useState<NotebookData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || notebook) return

    // Use pre-generated notebook cells if they include code cells
    if (paper.notebookCells && paper.notebookCells.some(c => c.type === 'code')) {
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
          const data = await response.json() as NotebookData
          setNotebook(data)
        }
      } catch (e) {
        console.error('Notebook error:', e)
      } finally {
        setIsLoading(false)
      }
    }

    createNotebook()
  }, [isOpen, paper, notebook])

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 h-full z-50 flex flex-col animate-slide-in-right bg-surface border-l border-surface-2 shadow-2xl" style={{ width: '480px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-2">
        <div>
          <p className="text-xs font-display uppercase tracking-wider text-teal">Notebook</p>
          <p className="text-xs mt-0.5 text-text-muted" style={{ maxWidth: '300px' }} title={paper.title}>
            {paper.title.substring(0, 50)}{paper.title.length > 50 ? '...' : ''}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded text-text-muted bg-surface-2"
        >
          ×
        </button>
      </div>

      {/* Sandbox iframe (when available) */}
      {notebook?.sandboxUrl && (
        <div className="border-b border-surface-2">
          <iframe
            src={notebook.sandboxUrl}
            className="w-full"
            style={{ height: '200px' }}
            title="Daytona Sandbox"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      )}

      {/* Body */}
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
              // Find which section this cell belongs to for cross-reference badge
              const section = (paper.sections || []).find(s => s.id === cell.sectionId)
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
                    workspaceId={notebook.daytonaWorkspaceId}
                    onRun={() => onCellRun?.()}
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

      {/* Footer */}
      <div className="px-4 py-2 text-xs border-t border-surface-2 text-text-muted">
        {notebook?.sandboxUrl ? (
          <a href={notebook.sandboxUrl} target="_blank" rel="noopener noreferrer" className="text-teal">
            Open in Daytona ↗
          </a>
        ) : (
          <span className="text-teal">⚡ Running in browser via Pyodide</span>
        )}
      </div>
    </div>
  )
}
