'use client'

import { ReadingMode } from '@/lib/types'

interface ReadingModeToggleProps {
  mode: ReadingMode
  onChange: (mode: ReadingMode) => void
}

const modes: { value: ReadingMode; label: string; description: string }[] = [
  { value: 'skim', label: 'Skim', description: 'Abstract + key results' },
  { value: 'read', label: 'Read', description: 'Full paper with interactive overlays' },
  { value: 'deep-dive', label: 'Deep Dive', description: 'Evidence chains and denser tooling' },
]

export default function ReadingModeToggle({ mode, onChange }: ReadingModeToggleProps) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg border p-1"
      style={{ borderColor: 'var(--border)', background: 'var(--background-raised)' }}
      role="group"
      aria-label="Reading mode"
    >
      {modes.map((item) => {
        const active = mode === item.value
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            title={item.description}
            aria-pressed={active}
            className="rounded-md px-3 py-1.5 font-display text-xs font-semibold transition-colors"
            style={{
              color: active ? '#07110e' : 'var(--text-muted)',
              background: active ? 'var(--teal)' : 'transparent',
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
