export default function Loading() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6" aria-live="polite">
      <div className="text-center">
        <div
          className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: 'var(--teal)', borderRightColor: 'var(--border)' }}
          aria-hidden="true"
        />
        <p className="font-display text-sm" style={{ color: 'var(--text-secondary)' }}>
          Opening your research workspace…
        </p>
      </div>
    </div>
  )
}
