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
  workspaceId?: string
  onRun?: (cellId: string) => void
}

export default function NotebookCell({ cell, workspaceId, onRun }: NotebookCellProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [output, setOutput] = useState('')
  const [outputError, setOutputError] = useState('')
  const [executionMode, setExecutionMode] = useState<'daytona' | 'pyodide' | null>(null)
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
      if (workspaceId) {
        // Daytona path (premium)
        setExecutionMode('daytona')
        const response = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: cell.content, workspaceId }),
        })
        const data = await response.json() as { stdout?: string; stderr?: string; error?: string; exitCode?: number }
        if (!response.ok) {
          setOutputError(data.error || 'Execution failed')
        } else {
          setOutput(data.stdout || '')
          if (data.stderr) setOutputError(data.stderr)
        }
      } else {
        // Pyodide in-browser fallback
        setExecutionMode('pyodide')
        setOutput('Loading Python runtime...')
        const result = await executePyodide(cell.content)
        setOutput(result.stdout)
        if (result.stderr) setOutputError(result.stderr)
      }
      onRun?.(cell.id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Execution failed'
      const isPyodidePackageError =
        msg.includes("pure Python 3 wheel") ||
        msg.includes("micropip") ||
        msg.includes("Can't find") ||
        msg.includes("No packages found")
      setOutputError(
        isPyodidePackageError
          ? "Some packages aren't available in the browser (Pyodide). Use the Daytona sandbox for full Python environment support."
          : msg
      )
    } finally {
      setIsRunning(false)
    }
  }

  if (cell.type === 'markdown') {
    return (
      <div className="p-4 border-b border-surface-2">
        <div className="text-sm leading-relaxed prose prose-invert max-w-none text-text font-serif">
          {cell.content.split('\n').map((line, i) => {
            if (line.startsWith('# ')) {
              return <h3 key={i} className="text-text font-display text-base mb-2">{line.slice(2)}</h3>
            }
            return <span key={i}>{line}<br /></span>
          })}
        </div>
      </div>
    )
  }

  if (cell.type === 'code') {
    return (
      <div className="border-b border-surface-2">
        <div className="flex items-center justify-between px-3 py-1.5 bg-surface-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-text-muted">python</span>
            {executionMode && (
              <span
                className="text-xs px-1.5 py-0.5 rounded font-mono"
                style={{
                  backgroundColor: executionMode === 'daytona' ? '#f5a62322' : '#00d4aa22',
                  color: executionMode === 'daytona' ? '#f5a623' : '#00d4aa',
                  border: `1px solid ${executionMode === 'daytona' ? '#f5a62333' : '#00d4aa33'}`,
                }}
              >
                {executionMode === 'daytona' ? 'Daytona Sandbox' : '⚡ Browser (Pyodide)'}
              </span>
            )}
          </div>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="text-xs px-2.5 py-1 rounded flex items-center gap-1.5 transition-all"
            style={{
              backgroundColor: isRunning ? '#1a2235' : '#00d4aa1a',
              color: isRunning ? '#9ca3af' : '#00d4aa',
              border: `1px solid ${isRunning ? '#1a2235' : '#00d4aa33'}`,
            }}
          >
            {isRunning ? (
              <><span className="animate-spin text-xs">⟳</span>Running...</>
            ) : (
              <>▶ Run</>
            )}
          </button>
        </div>
        <pre className="p-4 overflow-x-auto bg-background m-0 rounded-none">
          <code ref={codeRef} className="language-python text-xs font-mono">
            {cell.content}
          </code>
        </pre>
        {(output || outputError) && (
          <div className="px-4 py-3 text-xs font-mono border-t border-surface-2 bg-surface-4 whitespace-pre-wrap">
            {output && <span className="text-teal">{output}</span>}
            {outputError && <span className="text-amber">{outputError}</span>}
          </div>
        )}
      </div>
    )
  }

  return null
}

