'use client'

interface KeyboardShortcutsProps {
  isOpen: boolean
  onClose: () => void
}

const shortcuts = [
  { key: 'J', description: 'Next section' },
  { key: 'K', description: 'Previous section' },
  { key: 'E', description: 'Expand/collapse equation' },
  { key: 'N', description: 'Open/close notebook' },
  { key: 'C', description: 'Toggle citation graph' },
  { key: 'R', description: 'Switch reading mode' },
  { key: 'F', description: 'Fullscreen figure' },
  { key: 'D', description: "I don't understand this" },
  { key: '[', description: 'Navigate stack backward' },
  { key: ']', description: 'Navigate stack forward' },
  { key: '?', description: 'Show this help' },
]

export default function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(10, 14, 20, 0.9)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl p-6 max-w-sm w-full"
        style={{ backgroundColor: '#111827', border: '1px solid #1a2235' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display" style={{ color: '#e8e0d0', fontFamily: 'Syne, sans-serif' }}>
            Keyboard Shortcuts
          </h3>
          <button onClick={onClose} style={{ color: '#9ca3af' }}>×</button>
        </div>
        <div className="space-y-2">
          {shortcuts.map(({ key, description }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#9ca3af' }}>{description}</span>
              <kbd
                className="px-2 py-0.5 rounded text-xs font-mono"
                style={{ backgroundColor: '#1a2235', color: '#00d4aa', border: '1px solid #1a2235' }}
              >
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
