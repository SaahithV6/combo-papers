'use client'

import { useState, FormEvent } from 'react'

interface SearchInputProps {
  onSearch: (query: string) => void
  isLoading?: boolean
}

const EXAMPLE_QUERIES = [
  'How do sparse autoencoders compare for interpretability?',
  'What approaches work for protein structure diffusion?',
]

export default function SearchInput({ onSearch, isLoading = false }: SearchInputProps) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (query.trim()) onSearch(query.trim())
  }

  const handleExample = (example: string) => {
    setQuery(example)
    onSearch(example)
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <label htmlFor="research-intent" className="sr-only">
          Research question or topic
        </label>
        <textarea
          id="research-intent"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              if (query.trim() && !isLoading) onSearch(query.trim())
            }
          }}
          rows={3}
          placeholder="What are you trying to understand, compare, or decide?"
          className="ui-input min-h-[112px] resize-none px-4 py-3 text-[15px] leading-relaxed"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="hidden text-xs sm:block" style={{ color: 'var(--text-muted)' }}>
            Enter to build a path · Shift+Enter for a new line
          </span>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="ui-button ui-button-primary ml-auto"
          >
            {isLoading ? 'Orienting…' : 'Build research path →'}
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {EXAMPLE_QUERIES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => handleExample(example)}
            className="ui-chip text-left transition-colors hover:text-[var(--text)]"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  )
}
