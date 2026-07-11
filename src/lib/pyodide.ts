let worker: Worker | null = null
let workerReady = false
let pendingReady: Array<{ resolve: () => void; reject: (e: Error) => void }> = []
const pendingRuns = new Map<number, { resolve: (r: { stdout: string; stderr: string }) => void; reject: (e: Error) => void }>()
let messageId = 0

const EXECUTION_TIMEOUT_MS = 30_000
const READY_TIMEOUT_MS = 45_000

function resetWorker() {
  worker?.terminate()
  worker = null
  workerReady = false
}

function getWorker(): Worker {
  if (worker) return worker

  worker = new Worker('/pyodide-worker.js')

  worker.onmessage = (event: MessageEvent) => {
    const { type, stdout, stderr, error, id } = event.data as {
      type: string
      stdout?: string
      stderr?: string
      error?: string
      id?: number
    }

    if (type === 'ready') {
      workerReady = true
      for (const p of pendingReady) p.resolve()
      pendingReady = []
      return
    }

    if (type === 'result' && id !== undefined) {
      const pending = pendingRuns.get(id)
      if (pending) {
        pendingRuns.delete(id)
        pending.resolve({ stdout: stdout || '', stderr: stderr || '' })
      }
      return
    }

    if (type === 'error') {
      if (id !== undefined) {
        const pending = pendingRuns.get(id)
        if (pending) {
          pendingRuns.delete(id)
          pending.reject(new Error(error || 'Unknown error'))
        }
      } else {
        for (const p of pendingReady) p.reject(new Error(error || 'Pyodide init failed'))
        pendingReady = []
      }
    }
  }

  worker.onerror = (e: ErrorEvent) => {
    for (const p of pendingReady) p.reject(new Error(e.message))
    pendingReady = []
    for (const p of pendingRuns.values()) p.reject(new Error(e.message))
    pendingRuns.clear()
    resetWorker()
  }

  // Critical: worker only becomes ready after an explicit init
  worker.postMessage({ type: 'init' })

  return worker
}

function waitForReady(): Promise<void> {
  if (workerReady) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const pending = {
      resolve: () => {
        clearTimeout(timer)
        resolve()
      },
      reject: (error: Error) => {
        clearTimeout(timer)
        reject(error)
      },
    }
    const timer = window.setTimeout(() => {
      pendingReady = pendingReady.filter((item) => item !== pending)
      resetWorker()
      reject(
        new Error(
          'The in-page Python runtime took too long to load. Download the notebook or open it in Colab.'
        )
      )
    }, READY_TIMEOUT_MS)
    pendingReady.push(pending)
  })
}

export async function executePyodide(code: string): Promise<{ stdout: string; stderr: string }> {
  const w = getWorker()
  await waitForReady()

  const id = ++messageId

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRuns.delete(id)
      resetWorker()
      reject(new Error(`Execution timed out after ${EXECUTION_TIMEOUT_MS / 1000} seconds`))
    }, EXECUTION_TIMEOUT_MS)

    pendingRuns.set(id, {
      resolve: (result) => {
        clearTimeout(timer)
        resolve(result)
      },
      reject: (err) => {
        clearTimeout(timer)
        reject(err)
      },
    })

    w.postMessage({ type: 'run', code, id })
  })
}
