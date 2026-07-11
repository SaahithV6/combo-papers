'use client'

import { useState, useEffect, useRef } from 'react'
import hljs from 'highlight.js/lib/core'
import python from 'highlight.js/lib/languages/python'
import 'highlight.js/styles/github-dark.css'
import { NotebookCell as NotebookCellType } from '@/lib/types'
import { executePyodide } from '@/lib/pyodide'

hljs.registerLanguage('python', python)

interface NotebookCellProps {
  cell: NotebookCellType
  onRun?: (cellId: string) => void
}

export default function NotebookCell({ cell, onRun }: NotebookCellProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [output, setOutput] = useState('')
  const [outputError, setOutputError] = useState('')
  const [ran, setRan] = useState(false)
  const codeRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (cell.type === 'code' && codeRef.current) {
      codeRef.current.removeAttribute('data-highlighted')
      hljs.highlightElement(codeRef.current)
    }
  }, [cell.content, cell.type])

  const handleRun = async () => {
    if (cell.type !== 'code') return
    setIsRunning(true)
    setOutput('')
    setOutputError('')
    try {
      setOutput('Loading Python runtime...')
      const result = await executePyodide(cell.content)
      setOutput(result.stdout)
      if (result.stderr) setOutputError(result.stderr)
      setRan(true)
      onRun?.(cell.id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Execution failed'
      const isPyodidePackageError =
        msg.includes('pure Python 3 wheel') ||
        msg.includes('micropip') ||
        msg.includes("Can't find") ||
        msg.includes('No packages found')
      setOutputError(
        isPyodidePackageError
          ? "That package isn't in the in-page runtime. Stick to numpy/matplotlib/scipy/pandas/sklearn, or Download .ipynb / Open Colab from the notebook footer."
          : msg
      )
    } finally {
      setIsRunning(false)
    }
  }

  if (cell.type === 'markdown') {
    return (
      <div className="px-4 py-3 text-sm leading-relaxed border-b border-surface-2 prose prose-invert prose-sm max-w-none">
        <div className="text-text-muted whitespace-pre-wrap">{cell.content}</div>
      </div>
    )
  }

  return (
    <div className="border-b border-surface-2">
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-2/50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-text-muted">Code</span>
          {ran && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: '#00d4aa22',
                color: '#00d4aa',
                border: '1px solid #00d4aa33',
              }}
            >
              ⚡ Browser (Pyodide)
            </span>
          )}
        </div>
        <button
          onClick={() => void handleRun()}
          disabled={isRunning}
          className="text-xs px-2.5 py-1 rounded font-medium transition-opacity disabled:opacity-50"
          style={{ backgroundColor: '#00d4aa22', color: '#00d4aa' }}
        >
          {isRunning ? 'Running…' : '▶ Run'}
        </button>
      </div>
      <pre className="px-4 py-3 overflow-x-auto text-xs m-0 bg-[#0d1117]">
        <code ref={codeRef} className="language-python">
          {cell.content}
        </code>
      </pre>
      {(output || outputError) && (
        <div className="px-4 py-2 text-xs font-mono border-t border-surface-2 bg-black/40">
          {output && <pre className="whitespace-pre-wrap text-text-muted m-0">{output}</pre>}
          {outputError && (
            <pre className="whitespace-pre-wrap m-0 mt-1" style={{ color: '#f87171' }}>
              {outputError}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
