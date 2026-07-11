/**
 * MathJax 3 initialization and typesetting helpers.
 * Server-side safe: all operations are gated behind `typeof window !== 'undefined'`.
 */

// Extend the existing Window.MathJax declaration (first declared in EquationRenderer.tsx)
// by using a cast in function bodies rather than re-declaring the global type.

// Use a loose type alias to avoid conflict with the narrower Window.MathJax
// declaration in EquationRenderer.tsx. All accesses go through this alias.
type MathJaxFull = {
  typesetPromise?: (elements?: HTMLElement[]) => Promise<void>
  tex2svgPromise?: (latex: string) => Promise<HTMLElement>
  typeset?: (elements?: HTMLElement[]) => void
  startup?: {
    promise?: Promise<void>
    defaultReady?: () => void
  }
  tex?: object
}

function getMathJax(): MathJaxFull | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as Record<string, unknown>).MathJax as MathJaxFull | undefined
}

let initialized = false

/**
 * Ensure MathJax 3 is loaded and configured.
 * Safe to call multiple times — will only inject the script once.
 */
function ensureMathJax(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()

  const mj = getMathJax()
  if (initialized && mj?.startup?.promise) {
    return mj.startup.promise
  }

  return new Promise((resolve) => {
    if (document.getElementById('mathjax-script')) {
      // Already injected — wait for it to load
      const check = setInterval(() => {
        const m = getMathJax()
        if (m?.startup?.promise) {
          clearInterval(check)
          m.startup.promise.then(() => {
            initialized = true
            resolve()
          })
        }
      }, 50)
      return
    }

    // Configure MathJax before the script loads
    ;(window as unknown as Record<string, unknown>).MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true,
      },
      svg: {
        fontCache: 'global',
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
      },
      startup: {
        ready() {
          const m = getMathJax()
          if (m?.startup?.defaultReady) m.startup.defaultReady()
          initialized = true
        },
      },
    }

    const script = document.createElement('script')
    script.id = 'mathjax-script'
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js'
    script.async = true
    script.onload = () => {
      const m = getMathJax()
      if (m?.startup?.promise) {
        m.startup.promise.then(() => resolve())
      } else {
        resolve()
      }
    }
    script.onerror = () => resolve() // fail silently
    document.head.appendChild(script)
  })
}

/**
 * Typesets all math in the given element (or the whole document if omitted).
 * Returns a promise that resolves when typesetting is complete.
 */
export async function typesetMath(element?: HTMLElement): Promise<void> {
  if (typeof window === 'undefined') return

  await ensureMathJax()

  const mj = getMathJax()
  if (typeof mj?.typesetPromise === 'function') {
    await mj.typesetPromise(element ? [element] : undefined)
  } else if (typeof mj?.typeset === 'function') {
    mj.typeset(element ? [element] : undefined)
  }
}

/**
 * Renders a LaTeX string to an SVG HTML string for inline use.
 * Falls back to the raw LaTeX wrapped in a <code> tag if MathJax is unavailable.
 */
export async function renderLatex(latex: string): Promise<string> {
  if (typeof window === 'undefined') return `<code>${latex}</code>`

  await ensureMathJax()

  const mj = getMathJax()
  if (typeof mj?.tex2svgPromise === 'function') {
    try {
      const svgNode = await mj.tex2svgPromise(latex)
      return svgNode.innerHTML
    } catch {
      // fall through
    }
  }

  return `<code>${latex}</code>`
}
