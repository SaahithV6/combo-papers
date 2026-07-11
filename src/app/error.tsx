'use client'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6">
      <div className="ui-panel max-w-lg p-7 text-center">
        <p className="ui-label mb-3" style={{ color: 'var(--danger)' }}>
          Workspace interrupted
        </p>
        <h1 className="mb-3 font-display text-2xl font-semibold">Your research is still safe.</h1>
        <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          A part of the workspace failed to load. Try that step again; if it still fails, return to
          the workspace and use the built-in demo path.
        </p>
        <button type="button" className="ui-button ui-button-primary" onClick={reset}>
          Try again
        </button>
        {error.digest && (
          <p className="mt-4 font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Reference {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
