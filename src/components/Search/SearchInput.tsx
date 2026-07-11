'use client'

import { useState, FormEvent } from 'react'

interface SearchInputProps {
  onSearch: (query: string) => void
  isLoading?: boolean
}

const EXAMPLE_QUERIES = [
  'mechanistic interpretability in large language models',
  'diffusion models for protein structure',
  'attention mechanisms in transformers',
  'reinforcement learning from human feedback',
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
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Enter a research topic..."
          className="w-full px-5 py-4 pr-32 rounded-xl text-base outline-none transition-all"
          style={{
            backgroundColor: '#111827',
            color: '#e8e0d0',
            border: '1px solid #1a2235',
            fontFamily: 'IBM Plex Serif, serif',
          }}
          onFocus={e => { e.target.style.borderColor = '#00d4aa33' }}
          onBlur={e => { e.target.style.borderColor = '#1a2235' }}
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg text-sm font-display transition-all"
          style={{
            backgroundColor: isLoading || !query.trim() ? '#1a2235' : '#00d4aa',
            color: isLoading || !query.trim() ? '#9ca3af' : '#0a0e14',
          }}
        >
          {isLoading ? '...' : 'Search'}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {EXAMPLE_QUERIES.map(example => (
          <button
            key={example}
            onClick={() => handleExample(example)}
            className="text-xs px-3 py-1.5 rounded-full transition-all"
            style={{
              backgroundColor: '#111827',
              color: '#9ca3af',
              border: '1px solid #1a2235',
            }}
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  )
}
