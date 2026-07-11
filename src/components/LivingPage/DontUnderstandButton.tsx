'use client'

import { useState } from 'react'

interface DontUnderstandButtonProps {
  paragraph: string
  paperTitle: string
  userId?: string
  email?: string
  paperId?: string
  authHeaders?: Record<string, string>
}

interface PrerequisiteResult {
  concept: string
  explanation: string
  sourceReference?: string
  paperTitle?: string
  paperUrl?: string
}

export default function DontUnderstandButton({
  paragraph,
  paperTitle,
  userId = 'anonymous',
  email,
  paperId,
  authHeaders = {},
}: DontUnderstandButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<PrerequisiteResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    if (result) { setResult(null); return }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/prerequisite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ paragraph, paperTitle }),
      })
      
      if (!response.ok) throw new Error('Request failed')
      const data = await response.json()
      setResult(data)

      // Feed the lifelong mentor so the plan adapts across sessions
      void fetch('/api/agent/adapt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          eventType: 'dont_understand',
          concept: data.concept,
          paperTitle,
          paperId,
          userId,
          email,
        }),
      }).catch(() => {})
      try {
        const { playAction } = await import('@/hooks/useSoundscape')
        playAction('dont_understand')
      } catch {
        /* ignore */
      }
    } catch {
      setError('Could not identify prerequisite. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="my-2">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="text-xs px-2 py-1 rounded transition-all opacity-40 hover:opacity-100"
        style={{ backgroundColor: '#1a2235', color: '#9ca3af', border: '1px solid #1a2235' }}
        title="I don't understand this (D)"
        data-dont-understand
      >
        {isLoading ? '...' : result ? '✕ close' : "? I don't understand this"}
      </button>

      {error && (
        <p className="mt-1 text-xs" style={{ color: '#f5a623' }}>{error}</p>
      )}

      {result && (
        <div
          className="mt-2 p-3 rounded-lg text-sm animate-fade-in"
          style={{ backgroundColor: '#111827', border: '1px solid #00d4aa33' }}
        >
          <div className="flex items-start gap-2 mb-2">
            <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: '#00d4aa1a', color: '#00d4aa' }}>
              prerequisite
            </span>
            <span className="font-medium" style={{ color: '#e8e0d0' }}>{result.concept}</span>
          </div>
          <p className="text-xs mb-2" style={{ color: '#9ca3af' }}>{result.explanation}</p>
          {result.sourceReference && (
            <p className="text-xs" style={{ color: '#9ca3af' }}>
              Source:{' '}
              {result.paperUrl ? (
                <a
                  href={result.paperUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: '#00d4aa' }}
                >
                  {result.sourceReference}
                </a>
              ) : (
                <span style={{ color: '#f5a623' }}>{result.sourceReference}</span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
