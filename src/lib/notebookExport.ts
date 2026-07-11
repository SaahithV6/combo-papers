import type { NotebookCell } from '@/lib/types'

/** Build a nbformat 4 notebook object from our cells. */
export function cellsToNbformat(
  title: string,
  cells: NotebookCell[]
): Record<string, unknown> {
  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python' },
      colab: { provenance: [], name: title.slice(0, 80) },
    },
    cells: cells.map((c) => ({
      cell_type: c.type === 'code' ? 'code' : 'markdown',
      metadata: {},
      source: c.content.split('\n').map((line, i, arr) =>
        i < arr.length - 1 ? `${line}\n` : line
      ),
      ...(c.type === 'code' ? { outputs: [], execution_count: null } : {}),
    })),
  }
}

export function downloadIpynb(title: string, cells: NotebookCell[]): string {
  const nb = cellsToNbformat(title, cells)
  const blob = new Blob([JSON.stringify(nb, null, 2)], {
    type: 'application/x-ipynb+json',
  })
  const filename = `${(title || 'combo-papers').slice(0, 40).replace(/\W+/g, '_')}.ipynb`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return filename
}

/**
 * Open Colab without Google OAuth in our app.
 * Colab cannot iframe and cannot load arbitrary blobs — so we:
 *  1) download the .ipynb
 *  2) open a blank Colab tab
 * User: File → Upload notebook (the just-downloaded file). ~2 clicks, no API keys.
 */
export function openInColab(title: string, cells: NotebookCell[]): {
  filename: string
  colabOpened: boolean
} {
  const filename = downloadIpynb(title, cells)
  const colab = window.open(
    `https://colab.research.google.com/#create=true&title=${encodeURIComponent(title.slice(0, 60))}`,
    '_blank',
    'noopener,noreferrer'
  )
  return { filename, colabOpened: Boolean(colab) }
}
