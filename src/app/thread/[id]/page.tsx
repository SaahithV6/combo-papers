'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface ThreadPaper {
  id: string
  title: string
  processingStatus: string
}

export default function ThreadPage() {
  const params = useParams()
  const router = useRouter()
  const [papers, setPapers] = useState<ThreadPaper[]>([])

  // In a real implementation, this would load from Butterbase
  // For now, show a placeholder

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0e14' }}>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <button
          onClick={() => router.push('/')}
          className="mb-6 text-sm"
          style={{ color: '#9ca3af' }}
        >
          ← Back
        </button>

        <h1
          className="text-3xl font-display mb-4"
          style={{ color: '#e8e0d0', fontFamily: 'Syne, sans-serif' }}
        >
          Research Thread
        </h1>

        <p style={{ color: '#9ca3af' }}>
          Thread ID: {params.id}
        </p>

        <div className="mt-8 p-6 rounded-xl" style={{ backgroundColor: '#111827', border: '1px solid #1a2235' }}>
          <p className="text-sm" style={{ color: '#9ca3af' }}>
            Research threads allow you to organize multiple papers around a topic.
            Start from the search page to create a thread.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 rounded text-sm"
            style={{ backgroundColor: '#00d4aa', color: '#0a0e14' }}
          >
            New search →
          </button>
        </div>
      </div>
    </div>
  )
}
