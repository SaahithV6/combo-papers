'use client'

import { useState } from 'react'
import { Figure } from '@/lib/types'

interface FigureViewerProps {
  figure: Figure
  isActive?: boolean
}

export default function FigureViewer({ figure, isActive = false }: FigureViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const hasImage =
    !imageFailed && Boolean(figure.url?.startsWith('/') || figure.url?.startsWith('http'))

  return (
    <>
      <figure
        className={`my-8 overflow-hidden rounded-xl border transition-all duration-300 ${isActive ? 'figure-active' : ''}`}
        style={{
          borderColor: isActive ? 'var(--amber)' : 'var(--border)',
          boxShadow: isActive ? '0 0 18px var(--amber-soft)' : 'none',
        }}
      >
        <button
          type="button"
          className="flex min-h-56 w-full items-center justify-center"
          style={{ background: 'var(--surface)' }}
          onClick={() => hasImage && setIsFullscreen(true)}
          disabled={!hasImage}
          aria-label={hasImage ? `Expand figure: ${figure.caption}` : undefined}
          data-figure-trigger
        >
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={figure.url}
              alt={figure.caption}
              className="max-h-[30rem] w-full object-contain"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="p-6 text-center">
              <span className="ui-label">Figure unavailable</span>
              <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                Open the source PDF to inspect this figure.
              </p>
            </div>
          )}
        </button>
        <figcaption
          className="border-t px-4 py-3 text-xs leading-relaxed"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--background-raised)' }}
        >
          <span className="ui-label mr-2">Figure</span>
            {figure.caption}
        </figcaption>
      </figure>

      {isFullscreen && hasImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          style={{ background: 'rgba(3, 5, 8, 0.94)' }}
          onClick={() => setIsFullscreen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Expanded figure"
        >
          <div
            className="ui-panel max-h-[90vh] w-full max-w-6xl overflow-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex min-h-48 items-center justify-center p-4 md:p-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={figure.url} alt={figure.caption} className="max-h-[70vh] max-w-full object-contain" />
            </div>
            <div className="flex items-start gap-4 border-t p-4" style={{ borderColor: 'var(--border)' }}>
              <p className="flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {figure.caption}
              </p>
              <button type="button" className="ui-button" onClick={() => setIsFullscreen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
