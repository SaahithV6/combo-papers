'use client'

import { RabbitHoleItem } from '@/lib/types'

interface RabbitHoleStackProps {
  stack: RabbitHoleItem[]
  currentIndex: number
  onNavigate: (index: number) => void
}

export default function RabbitHoleStack({ stack, currentIndex, onNavigate }: RabbitHoleStackProps) {
  if (stack.length === 0) return null

  return (
    <div
      className="fixed left-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2"
      style={{ maxHeight: '60vh', overflowY: 'auto' }}
    >
      {stack.map((item, i) => (
        <button
          key={item.id}
          onClick={() => onNavigate(i)}
          className="relative group flex items-center gap-2 text-left transition-all"
          style={{
            transform: `translateX(${i === currentIndex ? 0 : -8}px) scale(${i === currentIndex ? 1 : 0.92})`,
            opacity: i === currentIndex ? 1 : 0.5,
          }}
        >
          {/* Stack card */}
          <div
            className="px-3 py-2 rounded-lg text-xs max-w-[140px]"
            style={{
              backgroundColor: '#111827',
              border: `1px solid ${i === currentIndex ? '#00d4aa' : '#1a2235'}`,
              boxShadow: i === currentIndex ? '0 0 10px rgba(0, 212, 170, 0.2)' : 'none',
            }}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <span style={{ color: '#9ca3af', fontSize: '9px' }}>
                {i === currentIndex ? '▶' : `${i + 1}`}
              </span>
              <span
                className="uppercase"
                style={{ color: '#9ca3af', fontSize: '9px', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {item.type}
              </span>
            </div>
            <p
              className="leading-tight"
              style={{
                color: i === currentIndex ? '#e8e0d0' : '#9ca3af',
                fontSize: '10px',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {item.title}
            </p>
          </div>
        </button>
      ))}

      {stack.length > 1 && (
        <div className="text-center">
          <span className="text-xs" style={{ color: '#9ca3af', fontFamily: 'JetBrains Mono, monospace' }}>
            [{currentIndex + 1}/{stack.length}]
          </span>
        </div>
      )}
    </div>
  )
}
