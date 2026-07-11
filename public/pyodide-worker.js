/* global importScripts, pyodide */

let pyodideReady = false
let pyodideInstance = null

async function initPyodide() {
  importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js')
  // eslint-disable-next-line no-undef
  pyodideInstance = await loadPyodide()
  try {
    await pyodideInstance.loadPackage(['numpy', 'matplotlib', 'scipy', 'pandas', 'scikit-learn'])
  } catch (err) {
    // If some packages fail to load, continue with what loaded successfully
    console.warn('Some packages failed to load during initialization:', err)
  }
  // Set matplotlib to use non-interactive AGG backend
  pyodideInstance.runPython(`
import matplotlib
matplotlib.use('agg')
import sys, io
`)
  pyodideReady = true
  self.postMessage({ type: 'ready' })
}

self.onmessage = async function (event) {
  const { type, code, id } = event.data

  if (type === 'init') {
    if (!pyodideReady) {
      try {
        await initPyodide()
      } catch (err) {
        self.postMessage({ type: 'error', error: String(err), id })
      }
    } else {
      self.postMessage({ type: 'ready' })
    }
    return
  }

  if (type === 'run') {
    if (!pyodideReady) {
      self.postMessage({ type: 'error', error: 'Pyodide not ready yet', id })
      return
    }

    try {
      // Redirect stdout/stderr
      pyodideInstance.runPython(`
import sys, io
_stdout_buf = io.StringIO()
_stderr_buf = io.StringIO()
sys.stdout = _stdout_buf
sys.stderr = _stderr_buf
`)

      // Auto-install packages imported in user code
      try {
        await pyodideInstance.loadPackagesFromImports(code)
      } catch (pkgErr) {
        // Fall back to micropip with keep_going=True so partial installs succeed
        try {
          const imports = Array.from(
            new Set((code.match(/(?:^|\n)\s*(?:import|from)\s+(\w+)/gm) || []).map(m => m.replace(/.*(?:import|from)\s+/, '')))
          )
          if (imports.length > 0) {
            await pyodideInstance.runPythonAsync(`
import micropip
try:
    await micropip.install(${JSON.stringify(imports)}, keep_going=True)
except Exception:
    pass
`)
          }
        } catch (_) { /* ignore secondary failure */ }
        // Forward a non-fatal warning so the user is informed
        pyodideInstance.runPython(`
import sys
sys.stderr.write("Note: some packages could not be loaded in the browser environment. Use the Daytona sandbox for full Python support.\\n")
`)
      }

      // Run user code
      pyodideInstance.runPython(code)

      // Collect output
      const stdout = pyodideInstance.runPython('_stdout_buf.getvalue()')
      const stderr = pyodideInstance.runPython('_stderr_buf.getvalue()')

      // Restore stdout/stderr
      pyodideInstance.runPython(`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
`)

      self.postMessage({ type: 'result', stdout, stderr, id })
    } catch (err) {
      // Attempt to restore stdout/stderr even on error
      try {
        pyodideInstance.runPython(`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
`)
      } catch (_) { /* ignore */ }
      self.postMessage({ type: 'error', error: String(err), id })
    }
  }
}

// Start initialization immediately
initPyodide().catch(err => {
  self.postMessage({ type: 'error', error: 'Failed to initialize Pyodide: ' + String(err) })
})
