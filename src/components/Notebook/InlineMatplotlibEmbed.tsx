'use client'

import { useState } from 'react'
import { NotebookCell as NotebookCellType } from '@/lib/types'
import { executePyodide } from '@/lib/pyodide'

interface InlineMatplotlibEmbedProps {
  cell: NotebookCellType
  onOpenInNotebook?: (cellId: string) => void
}

/**
 * Renders a Pyodide-executed matplotlib chart inline within a paper section.
 * Uses matplotlib.pyplot.savefig() to a BytesIO buffer and converts to a base64 <img>.
 */
export default function InlineMatplotlibEmbed({ cell, onOpenInNotebook }: InlineMatplotlibEmbedProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRun = async () => {
    setIsRunning(true)
    setError(null)
    setImgSrc(null)
    try {
      // Wrap the user code so that plt.show() is replaced with savefig to a base64 buffer
      const wrappedCode = `
import sys, io, base64
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Capture plt.show() calls
_orig_show = plt.show
_fig_b64 = None
def _patched_show(*args, **kwargs):
    global _fig_b64
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
    buf.seek(0)
    _fig_b64 = base64.b64encode(buf.read()).decode('utf-8')
    buf.close()
    plt.clf()
plt.show = _patched_show

${cell.content}

# If plt.show() was never called but there is an active figure, save it
if _fig_b64 is None and plt.get_fignums():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
    buf.seek(0)
    _fig_b64 = base64.b64encode(buf.read()).decode('utf-8')
    buf.close()

if _fig_b64:
    print("__IMG__:" + _fig_b64)
`
      const result = await executePyodide(wrappedCode)
      const lines = result.stdout.split('\n')
      const imgLine = lines.find(l => l.startsWith('__IMG__:'))
      if (imgLine) {
        setImgSrc(`data:image/png;base64,${imgLine.slice('__IMG__:'.length)}`)
      } else if (result.stderr) {
        setError(result.stderr)
      } else {
        setError('No chart output detected. Make sure the code calls plt.show() or creates a figure.')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Execution failed'
      setError(
        msg.includes('pure Python 3 wheel') || msg.includes('micropip') || msg.includes("Can't find")
          ? "Some packages aren't available in the browser (Pyodide). Use the Daytona sandbox for full Python environment support."
          : msg
      )
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="my-4 rounded border border-surface-2 overflow-hidden bg-surface">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-3 border-b border-surface-2">
        <span className="text-xs text-text-muted font-mono">📊 Interactive Chart</span>
        <div className="flex items-center gap-2">
          {onOpenInNotebook && (
            <button
              onClick={() => onOpenInNotebook(cell.id)}
              className="text-xs text-teal hover:underline"
            >
              Open in Notebook →
            </button>
          )}
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="text-xs px-2.5 py-1 rounded flex items-center gap-1 transition-all"
            style={{
              backgroundColor: isRunning ? '#1a2235' : '#00d4aa1a',
              color: isRunning ? '#9ca3af' : '#00d4aa',
              border: `1px solid ${isRunning ? '#1a2235' : '#00d4aa33'}`,
            }}
          >
            {isRunning ? (
              <><span className="animate-spin text-xs">⟳</span> Running...</>
            ) : (
              <>▶ Run</>
            )}
          </button>
        </div>
      </div>

      {/* Output */}
      <div className="p-3">
        {!imgSrc && !error && !isRunning && (
          <p className="text-xs text-text-muted font-serif italic text-center py-4">
            Click ▶ Run to render the chart
          </p>
        )}
        {isRunning && (
          <div className="flex items-center justify-center py-6">
            <span className="text-xs text-text-muted">Loading Python runtime and rendering chart...</span>
          </div>
        )}
        {imgSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt="Matplotlib chart"
            className="max-w-full rounded"
            style={{ display: 'block', margin: '0 auto' }}
          />
        )}
        {error && (
          <p className="text-xs font-mono text-amber whitespace-pre-wrap">{error}</p>
        )}
      </div>
    </div>
  )
}
