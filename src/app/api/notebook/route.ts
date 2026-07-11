import { NextRequest, NextResponse } from 'next/server'
import { generateNotebookCells } from '@/lib/claude'
import { createWorkspace } from '@/lib/daytona'
import { isLlmConfigured } from '@/lib/llm'
import { ProcessedPaper } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const BASE_VIZ_CELLS = (title: string, authors: string[]) => [
  {
    id: 'cell1',
    type: 'markdown' as const,
    content: `# ${title}\n\nInteractive lab — runs in-browser (Pyodide) with numpy/matplotlib. Edit cells, re-run, then rabbit-hole back into the Living Page.`,
    sectionId: 'sec-intro',
    isEditable: false,
  },
  {
    id: 'cell2',
    type: 'code' as const,
    content: `import numpy as np
import matplotlib.pyplot as plt

print("Paper:", ${JSON.stringify(title)})
print("Authors:", ${JSON.stringify(authors.slice(0, 3).join(', '))})

# Base visualization scaffold — replace with the paper's core curve/geometry
x = np.linspace(0, 2 * np.pi, 200)
y = np.sin(x) * np.exp(-0.1 * x)
plt.figure(figsize=(6, 3))
plt.plot(x, y, color="#00d4aa")
plt.title("Editable demo plot")
plt.xlabel("x")
plt.ylabel("y")
plt.grid(True, alpha=0.3)
plt.show()
print("Edit this cell to encode the paper's key relationship.")`,
    sectionId: 'sec-method',
    isEditable: true,
  },
  {
    id: 'cell3',
    type: 'code' as const,
    content: `# Parameter playground — change values and re-run
import numpy as np

learning_rate = 0.01
hidden_dims = 64
sparsity = 0.1
noise = 0.05

rng = np.random.default_rng(0)
signal = np.linspace(-1, 1, hidden_dims)
obs = signal + noise * rng.normal(size=hidden_dims)
sparse = obs * (np.abs(obs) > sparsity)

print(f"lr={learning_rate} hidden={hidden_dims} sparsity={sparsity}")
print("nonzero after threshold:", int(np.count_nonzero(sparse)))
print("mean abs:", float(np.mean(np.abs(sparse))))`,
    sectionId: 'sec-results',
    isEditable: true,
  },
]

export async function POST(request: NextRequest) {
  try {
    const { paper, action } = (await request.json()) as {
      paper: ProcessedPaper & { id?: string }
      action: 'create' | 'get'
    }

    if (!paper || !paper.id) {
      return NextResponse.json({ error: 'Paper data is required' }, { status: 400 })
    }

    if (action === 'get') {
      return NextResponse.json({ status: 'pending', cells: [] })
    }

    let cells
    if (isLlmConfigured()) {
      const sections = (paper.sections || []).map((s) => ({ id: s.id, title: s.title }))
      cells = await generateNotebookCells(paper.title, sections, paper.githubUrl)
      // Ensure at least one runnable viz cell
      if (!cells.some((c) => c.type === 'code')) {
        cells = [...cells, ...BASE_VIZ_CELLS(paper.title, paper.authors).filter((c) => c.type === 'code')]
      }
    } else {
      cells = BASE_VIZ_CELLS(paper.title, paper.authors || [])
    }

    let sandboxUrl
    let daytonaWorkspaceId
    if (process.env.DAYTONA_API_KEY) {
      try {
        const repoUrl =
          'githubRepos' in paper
            ? (paper as ProcessedPaper & { githubRepos?: Array<{ url: string }> }).githubRepos?.[0]
                ?.url
            : undefined
        const workspace = await createWorkspace(repoUrl)
        sandboxUrl = workspace.url
        daytonaWorkspaceId = workspace.id
      } catch (e) {
        console.warn('Daytona workspace creation failed:', e)
      }
    }

    const colabUrl = buildColabUrl(paper.title, cells)

    return NextResponse.json({
      cells,
      sandboxUrl,
      daytonaWorkspaceId,
      colabUrl,
      status: sandboxUrl ? 'ready' : 'cells-only',
    })
  } catch (error) {
    console.error('Notebook error:', error)
    return NextResponse.json(
      {
        error: 'Notebook creation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function buildColabUrl(
  title: string,
  cells: Array<{ type: string; content: string }>
): string {
  // GitHub-free: open blank Colab; user can paste. Full gist upload needs a token.
  // Encode a minimal .ipynb as a data URL hint in fragment is too large — use query prefills via nbviewer alternative.
  const nb = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: { kernelspec: { name: 'python3', display_name: 'Python 3' } },
    cells: cells.map((c) => ({
      cell_type: c.type === 'code' ? 'code' : 'markdown',
      metadata: {},
      source: c.content.split('\n').map((line, i, arr) => (i < arr.length - 1 ? `${line}\n` : line)),
      ...(c.type === 'code' ? { outputs: [], execution_count: null } : {}),
    })),
  }
  // Store for client download; Colab open uses blank + title
  void nb
  return `https://colab.research.google.com/#create=true&title=${encodeURIComponent(title.slice(0, 80))}`
}
