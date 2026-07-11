'use client'

import { useState } from 'react'

interface FollowThatCheckpointProps {
  /** Prompt sentence displayed between sections */
  prompt: string
  /** Callback fired when the reader submits a response */
  onResponse?: (response: string) => void
}

/**
 * A "Did you follow that?" checkpoint placed between major sections.
 * Shows a single prompt sentence and a free-text input so the reader
 * can surface confusion or confirm understanding before moving on.
 */
export default function FollowThatCheckpoint({ prompt, onResponse }: FollowThatCheckpointProps) {
  const [response, setResponse] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const handleSubmit = () => {
    if (!response.trim()) {
      setDismissed(true)
      return
    }
    onResponse?.(response.trim())
    setSubmitted(true)
    setTimeout(() => setDismissed(true), 1500)
  }

  if (submitted) {
    return (
      <div
        className="my-8 p-4 rounded-xl text-center text-sm transition-opacity duration-500"
        style={{ backgroundColor: '#111827', border: '1px solid #00d4aa22', color: '#00d4aa' }}
      >
        Got it — thanks for the note.
      </div>
    )
  }

  return (
    <div
      className="my-8 p-4 rounded-xl"
      style={{ backgroundColor: '#111827', border: '1px solid #1a2235' }}
    >
      <div className="flex items-start gap-3">
        <span
          className="text-lg shrink-0 mt-0.5"
          style={{ color: '#00d4aa' }}
          aria-hidden
        >
          ?
        </span>
        <div className="flex-1">
          <p
            className="text-sm mb-3"
            style={{ color: '#e8e0d0', fontFamily: 'IBM Plex Serif, serif' }}
          >
            {prompt}
          </p>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
            }}
            placeholder="Anything unclear? Or just hit Enter to continue…"
            rows={2}
            className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none transition-colors"
            style={{
              backgroundColor: '#0a0e14',
              border: '1px solid #1a2235',
              color: '#e8e0d0',
              fontFamily: 'IBM Plex Serif, serif',
            }}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px]" style={{ color: '#6b7280' }}>
              ⌘↵ to submit
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setDismissed(true)}
                className="text-xs px-3 py-1 rounded transition-colors"
                style={{ color: '#6b7280' }}
              >
                Skip
              </button>
              <button
                onClick={handleSubmit}
                className="text-xs px-3 py-1 rounded transition-colors"
                style={{
                  backgroundColor: '#00d4aa22',
                  color: '#00d4aa',
                  border: '1px solid #00d4aa44',
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
