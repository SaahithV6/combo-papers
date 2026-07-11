import { NextRequest, NextResponse } from 'next/server'
import { detectPrerequisites } from '@/lib/detectPrerequisites'
import { querySupermemory } from '@/lib/supermemory'
import { searchWithBrowserUse } from '@/lib/browseruse'

export const runtime = 'nodejs'
export const maxDuration = 120

// Minimum similarity score to use a cached Supermemory result
const MEMORY_MATCH_THRESHOLD = 0.8

export async function POST(request: NextRequest) {
  try {
    const { paragraph, paperTitle } = await request.json()

    if (!paragraph) {
      return NextResponse.json({ error: 'paragraph is required' }, { status: 400 })
    }

    // Step 1: Detect the missing prerequisite concept
    const prerequisite = await detectPrerequisites(paragraph, paperTitle || 'Unknown Paper')

    // Step 2: Check Supermemory for existing knowledge
    const memoryResults = await querySupermemory(prerequisite.searchQuery)
    if (memoryResults.length > 0 && memoryResults[0].score > MEMORY_MATCH_THRESHOLD) {
      return NextResponse.json({
        concept: prerequisite.concept,
        source: 'memory',
        content: memoryResults[0].content,
        metadata: memoryResults[0].metadata,
        searchQuery: prerequisite.searchQuery,
      })
    }

    // Step 3: Search all 11 sources via Browser Use
    if (process.env.BROWSER_USE_API_KEY) {
      try {
        const papers = await searchWithBrowserUse(prerequisite.searchQuery)
        const topPaper = papers[0]
        if (topPaper) {
          return NextResponse.json({
            concept: prerequisite.concept,
            source: 'browser-use',
            papers: papers.slice(0, 3),
            searchQuery: prerequisite.searchQuery,
            prerequisiteRef: prerequisite.sourceReference,
          })
        }
      } catch (err) {
        console.warn('Browser Use search failed for prerequisite:', err)
      }
    }

    // Step 4: Return Claude's identified reference
    return NextResponse.json({
      concept: prerequisite.concept,
      source: 'claude',
      searchQuery: prerequisite.searchQuery,
      paperTitle: prerequisite.paperTitle,
      paperUrl: prerequisite.paperUrl,
      sourceReference: prerequisite.sourceReference,
    })
  } catch (error) {
    console.error('Prerequisite lookup error:', error)
    return NextResponse.json(
      { error: 'Lookup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
