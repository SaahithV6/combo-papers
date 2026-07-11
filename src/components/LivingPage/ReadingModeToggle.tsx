'use client'

import { ReadingMode } from '@/lib/types'

interface ReadingModeToggleProps {
  mode: ReadingMode
  onChange: (mode: ReadingMode) => void
}

const modes: { value: ReadingMode; label: string; description: string }[] = [
  { value: 'skim', label: 'Skim', description: 'Abstract + figures + key results' },
  { value: 'read', label: 'Read', description: 'Full paper with interactive overlays' },
  { value: 'deep-dive', label: 'Deep Dive', description: 'Full paper + notebooks + related' },
]

export default function ReadingModeToggle({ mode, onChange }: ReadingModeToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: '#111827', border: '1px solid #1a2235' }}>
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          title={m.description}
          className={`px-3 py-1.5 rounded-md text-sm font-display transition-all ${
            mode === m.value
              ? 'text-background font-medium'
              : 'text-text-muted hover:text-text'
          }`}
          style={mode === m.value ? { backgroundColor: '#00d4aa', color: '#0a0e14' } : {}}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
