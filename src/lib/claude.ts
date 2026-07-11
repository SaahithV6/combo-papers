import { Paper, PaperMetadata, NotebookCell } from './types'
import {
  chatCompletion,
  extractJsonArray,
  extractJsonObject,
  isLlmConfigured,
} from './llm'

export async function rankByRelevance(
  papers: PaperMetadata[],
  query: string
): Promise<Array<PaperMetadata & { relevanceScore: number; relevanceReason: string }>> {
  if (!isLlmConfigured()) {
    return papers.slice(0, 10).map((p) => ({
      ...p,
      relevanceScore: 50,
      relevanceReason: 'LLM not configured',
    }))
  }

  const prompt = `Given the research query: "${query}"

Rate each of the following papers for relevance on a scale of 0-100, and provide a one-sentence reason.

Papers:
${papers
  .map(
    (p, i) => `${i + 1}. Title: "${p.title}"
   Authors: ${p.authors?.slice(0, 3).join(', ')}
   Abstract: ${(p.abstract || '').substring(0, 200)}`
  )
  .join('\n\n')}

Return a JSON array with one entry per paper in the same order:
[{"score": 95, "reason": "Directly addresses the query by..."}, ...]

Return ONLY valid JSON array.`

  try {
    const text = await chatCompletion([{ role: 'user', content: prompt }], {
      maxTokens: 2000,
    })
    const ratings = extractJsonArray(text) as Array<{ score: number; reason: string }>

    return papers
      .map((p, i) => ({
        ...p,
        relevanceScore: ratings[i]?.score ?? 50,
        relevanceReason: ratings[i]?.reason ?? 'Relevance not determined',
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10)
  } catch (error) {
    console.error('rankByRelevance error:', error)
    return papers.slice(0, 10).map((p) => ({
      ...p,
      relevanceScore: 50,
      relevanceReason: 'Ranking failed',
    }))
  }
}

export async function parsePaper(
  title: string,
  authors: string[],
  pdfText: string,
  _sourceUrl: string
): Promise<Partial<Paper>> {
  const systemPrompt = `You are a scientific paper processing AI. Extract structured information from research papers. Return ONLY valid JSON.`

  const userPrompt = `Process this research paper and extract ALL structured information. Return a JSON object with this exact schema:

{
  "tldr": [{"sentence": "...", "sourceSentenceId": "block-id-from-text"}],
  "sections": [{
    "id": "sec-intro",
    "title": "Introduction",
    "level": 1,
    "isAppendix": false,
    "content": [{"id": "blk-1", "type": "paragraph", "raw": "..."}],
    "marginNotes": []
  }],
  "variables": [{"symbol": "x", "name": "input variable", "definition": "...", "units": "...", "firstSeenSectionId": "sec-intro", "allOccurrences": ["blk-1", "blk-2"]}],
  "equations": [{"id": "eq-1", "latex": "E=mc^2", "label": "Eq. 1", "storySteps": ["step1", "step2"], "relatedVariables": ["E", "m", "c"], "blockId": "blk-2"}],
  "figures": [{"id": "fig-1", "url": "", "caption": "...", "label": "Figure 1", "referencedByBlockIds": ["blk-3"]}],
  "citations": [{"id": "cite-1", "title": "...", "authors": ["..."], "year": 2020, "arxivId": "2001.xxxxx", "isFoundational": true}],
  "notationWarnings": [{"symbol": "x", "sectionA": "sec-intro", "meaningA": "input", "sectionB": "sec-method", "meaningB": "output"}],
  "evidenceChains": [{"claim": "...", "experiment": "...", "figureId": "fig-1", "statisticalResult": "p < 0.05", "conclusion": "...", "blockId": "blk-5"}],
  "notebookCells": [{"id": "nb-1", "type": "markdown", "content": "# Overview", "sectionId": "sec-intro", "isEditable": false}],
  "githubUrl": "https://github.com/..."
}

Paper: ${title}
Authors: ${authors.join(', ')}
Text (first 16000 chars): ${pdfText.substring(0, 16000)}

Make TL;DR exactly 3 sentences with sourceSentenceId referencing actual block IDs from your sections.
Extract real equations using LaTeX. Include at least 5 sections with 3-5 paragraphs each.
Preserve actual statistics, percentages, p-values, and experimental details from the paper.
Each paragraph should be 3-5 sentences with dense, paper-like content including specific numbers and findings.
Return ONLY valid JSON.`

  try {
    const text = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 8000 }
    )
    return extractJsonObject(text) as Partial<Paper>
  } catch (error) {
    console.error('parsePaper error:', error)
    return {
      tldr: [
        { sentence: `This paper presents research on ${title}.`, sourceSentenceId: 'blk-abstract-1' },
        { sentence: 'The authors provide empirical evidence for their approach.', sourceSentenceId: 'blk-abstract-2' },
        { sentence: 'Results demonstrate significant improvements.', sourceSentenceId: 'blk-abstract-3' },
      ],
      sections: [
        {
          id: 'sec-abstract',
          title: 'Abstract',
          level: 1,
          isAppendix: false,
          content: [{ id: 'blk-abstract-1', type: 'paragraph', raw: pdfText.substring(0, 500) }],
          marginNotes: [],
        },
      ],
      variables: [],
      equations: [],
      figures: [],
      citations: [],
      notationWarnings: [],
      evidenceChains: [],
      notebookCells: [],
    }
  }
}

export async function findPrerequisiteConcept(
  paragraph: string,
  paperTitle: string
): Promise<{
  concept: string
  searchQuery: string
  sourceReference?: string
  paperTitle?: string
  paperUrl?: string
  explanation?: string
}> {
  try {
    const text = await chatCompletion(
      [
        {
          role: 'user',
          content: `A researcher doesn't understand this paragraph from "${paperTitle}":

"${paragraph}"

Identify the single most important missing prerequisite concept. Return the original authors' exact terminology.

Return JSON:
{
  "concept": "exact concept name as used in literature",
  "searchQuery": "search query to find the foundational paper about this concept",
  "explanation": "1-3 sentence explanation of why this prerequisite is needed",
  "sourceReference": "Original paper/textbook that introduced this concept",
  "paperTitle": "Exact title of key reference paper if applicable",
  "paperUrl": "arXiv or DOI URL if known"
}

Return ONLY valid JSON.`,
        },
      ],
      { maxTokens: 1000 }
    )
    return extractJsonObject(text) as {
      concept: string
      searchQuery: string
      sourceReference?: string
      paperTitle?: string
      paperUrl?: string
      explanation?: string
    }
  } catch (error) {
    console.error('findPrerequisiteConcept error:', error)
    return {
      concept: 'prerequisite concept',
      searchQuery: paragraph.split(' ').slice(0, 5).join(' '),
      explanation: 'Could not resolve prerequisite with the configured LLM.',
    }
  }
}

export async function generateNotebookCells(
  title: string,
  sections: Array<{ id: string; title: string }>,
  githubUrl?: string
): Promise<NotebookCell[]> {
  const prompt = `Generate a Jupyter notebook for: "${title}"
${githubUrl ? `GitHub repository: ${githubUrl}` : ''}
Sections: ${sections.map((s) => s.title).join(', ')}

IMPORTANT: This notebook runs in Pyodide (Python in the browser). Only use packages that are available in Pyodide:
- Allowed: numpy, matplotlib, scipy, pandas, scikit-learn, networkx, sympy, statsmodels, seaborn, pillow
- Do NOT use: torch, tensorflow, obstore, pyarrow, or any package requiring native/C extensions not available in Pyodide

Return JSON array of 5-8 notebook cells including markdown explanations, runnable Python code with numpy/matplotlib, and output cells:
[
  {"id": "nb-1", "type": "markdown", "content": "# ${title}\\n\\nOverview...", "sectionId": "${sections[0]?.id || 'sec-intro'}", "isEditable": false},
  {"id": "nb-2", "type": "code", "content": "import numpy as np\\nimport matplotlib.pyplot as plt\\n# Core algorithm", "sectionId": "${sections[1]?.id || 'sec-method'}", "isEditable": true},
  {"id": "nb-3", "type": "code", "content": "# Try it yourself: modify parameters\\n", "sectionId": "${sections[sections.length - 1]?.id || 'sec-results'}", "isEditable": true}
]

Include runnable Python demonstrating the paper's core algorithms. Return ONLY valid JSON array.`

  const maxRetries = 2
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const text = await chatCompletion([{ role: 'user', content: prompt }], {
        maxTokens: 4000,
      })

      let jsonText = text
      const jsonMatch = jsonText.match(/\[[\s\S]*/)
      if (!jsonMatch) throw new Error('No JSON array found in response')
      jsonText = jsonMatch[0]

      try {
        return JSON.parse(jsonText)
      } catch {
        let depth = 0
        let lastCompleteEnd = -1
        for (let i = 0; i < jsonText.length; i++) {
          if (jsonText[i] === '{' || jsonText[i] === '[') depth++
          else if (jsonText[i] === '}' || jsonText[i] === ']') {
            depth--
            if (depth === 1) lastCompleteEnd = i
          }
        }
        if (lastCompleteEnd > 0) {
          const repaired = jsonText.substring(0, lastCompleteEnd + 1) + ']'
          return JSON.parse(repaired)
        }
        throw new Error('Could not repair truncated JSON')
      }
    } catch (error: unknown) {
      const isRateLimit = error instanceof Error && error.message.includes('429')
      if (attempt < maxRetries && isRateLimit) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt + 1) * 1000))
        continue
      }
      if (attempt === maxRetries) {
        console.error('generateNotebookCells error:', error)
      }
    }
  }

  return [
    {
      id: 'nb-1',
      type: 'markdown',
      content: `# ${title}\n\nThis notebook demonstrates the core concepts from the paper.`,
      sectionId: sections[0]?.id || 'sec-intro',
      isEditable: false,
    },
  ]
}
