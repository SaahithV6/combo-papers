import { NextRequest, NextResponse } from 'next/server'
import { generateNotebookCells } from '@/lib/claude'
import { createWorkspace } from '@/lib/daytona'
import { ProcessedPaper } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { paper, action } = await request.json() as { paper: ProcessedPaper & { id?: string }; action: 'create' | 'get' }

    if (!paper || !paper.id) {
      return NextResponse.json({ error: 'Paper data is required' }, { status: 400 })
    }

    if (action === 'get') {
      // Return existing notebook status
      return NextResponse.json({ status: 'pending', cells: [] })
    }

    // Generate notebook cells with Claude
    let cells
    if (process.env.ANTHROPIC_API_KEY) {
      const sections = (paper.sections || []).map(s => ({ id: s.id, title: s.title }))
      cells = await generateNotebookCells(paper.title, sections, paper.githubUrl)
    } else {
      // Demo fallback cells — always include at least 2 code cells
      cells = [
        {
          id: 'cell1',
          type: 'markdown' as const,
          content: `# ${paper.title}\n\n**Demo Notebook**\n\nThis notebook demonstrates the core concepts from this paper. Configure \`ANTHROPIC_API_KEY\` to generate a paper-specific notebook.`,
          sectionId: 'sec-intro',
          isEditable: false,
        },
        {
          id: 'cell2',
          type: 'code' as const,
          content: `import numpy as np
import matplotlib.pyplot as plt

# Core demonstration
# This would implement the paper's algorithm
print("Paper:", "${paper.title}")
print("Authors:", "${paper.authors.slice(0, 3).join(', ')}")`,
          sectionId: 'sec-method',
          isEditable: true,
        },
        {
          id: 'cell3',
          type: 'code' as const,
          content: `# Try it yourself: explore parameters
# Uses only Pyodide-compatible packages (numpy, matplotlib, scipy, pandas, scikit-learn)
import numpy as np

learning_rate = 0.01  # Try: 0.001, 0.1
hidden_dims = 64      # Try: 32, 128, 256
sparsity = 0.1        # Try: 0.01, 0.5

print(f"Configuration: lr={learning_rate}, hidden={hidden_dims}, sparsity={sparsity}")`,
          sectionId: 'sec-results',
          isEditable: true,
        }
      ]
    }

    // Persist notebook cells to MongoDB (non-blocking)
    if (paper.id && cells.length > 0) {
      import('@/lib/mongodb')
        .then(async ({ getDb }) => {
          const db = await getDb()
          await db.collection('papers').updateOne(
            { id: paper.id },
            { $set: { notebookCells: cells, updatedAt: Date.now() } }
          )
        })
        .catch((e: unknown) => console.warn('MongoDB notebook persist failed:', e))
    }

    // Try to create Daytona workspace
    let sandboxUrl
    let daytonaWorkspaceId
    if (process.env.DAYTONA_API_KEY) {
      try {
        const repoUrl = 'githubRepos' in paper ? (paper as ProcessedPaper & { id?: string; githubRepos?: Array<{ url: string }> }).githubRepos?.[0]?.url : undefined
        const workspace = await createWorkspace(repoUrl)
        sandboxUrl = workspace.url
        daytonaWorkspaceId = workspace.id
      } catch (e) {
        console.warn('Daytona workspace creation failed:', e)
      }
    }

    return NextResponse.json({
      cells,
      sandboxUrl,
      daytonaWorkspaceId,
      status: sandboxUrl ? 'ready' : 'cells-only',
    })
  } catch (error) {
    console.error('Notebook error:', error)
    return NextResponse.json(
      { error: 'Notebook creation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
