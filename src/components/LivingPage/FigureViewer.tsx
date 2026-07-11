'use client'

import { useState } from 'react'
import { Figure } from '@/lib/types'

interface FigureViewerProps {
  figure: Figure
  isActive?: boolean
}

export default function FigureViewer({ figure, isActive = false }: FigureViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  return (
    <>
      <div
        className={`my-6 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 ${isActive ? 'figure-active' : ''}`}
        style={{
          border: isActive ? '1px solid #f5a623' : '1px solid #1a2235',
          boxShadow: isActive ? '0 0 12px rgba(245, 166, 35, 0.3)' : 'none',
        }}
        onClick={() => setIsFullscreen(true)}
      >
        <div className="w-full h-48 flex items-center justify-center" style={{ backgroundColor: '#111827' }}>
          {figure.url.startsWith('/') || figure.url.startsWith('http') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={figure.url}
              alt={figure.caption}
              className="max-h-full max-w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : null}
          <div className="text-center p-4">
            <span className="text-4xl mb-2 block">📊</span>
            <span className="text-xs" style={{ color: '#9ca3af' }}>Figure · Click to expand</span>
          </div>
        </div>
        <div className="px-4 py-2" style={{ backgroundColor: '#0d1117', borderTop: '1px solid #1a2235' }}>
          <p className="text-xs" style={{ color: '#9ca3af', fontFamily: 'IBM Plex Serif, serif' }}>
            {figure.caption}
          </p>
        </div>
      </div>

      {isFullscreen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-8"
          style={{ backgroundColor: 'rgba(10, 14, 20, 0.95)' }}
          onClick={() => setIsFullscreen(false)}
        >
          <div className="max-w-4xl w-full" style={{ border: '1px solid #f5a623' }}>
            <div className="w-full min-h-48 flex items-center justify-center p-8" style={{ backgroundColor: '#111827' }}>
              <span className="text-8xl">📊</span>
            </div>
            <div className="p-4" style={{ backgroundColor: '#0d1117' }}>
              <p className="text-sm" style={{ color: '#e8e0d0' }}>{figure.caption}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
