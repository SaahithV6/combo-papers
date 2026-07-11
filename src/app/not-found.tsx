import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="ui-label mb-3">Path not found</p>
        <h1 className="mb-3 font-display text-3xl font-semibold">This research path moved.</h1>
        <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Start a new path or return to your saved library.
        </p>
        <div className="flex justify-center gap-2">
          <Link href="/" className="ui-button ui-button-primary">
            New path
          </Link>
          <Link href="/saved" className="ui-button">
            Open library
          </Link>
        </div>
      </div>
    </div>
  )
}
