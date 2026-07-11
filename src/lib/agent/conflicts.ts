import { chatCompletion, extractJsonObject, isLlmConfigured } from '@/lib/llm'

export interface ApproachConflict {
  id: string
  topic: string
  paperA: { id?: string; title: string; stance: string }
  paperB: { id?: string; title: string; stance: string }
  whyItMatters: string
  prosA: string[]
  consA: string[]
  prosB: string[]
  consB: string[]
  whenToChooseA: string
  whenToChooseB: string
  confidence: number
}

export interface ConflictAnalysis {
  query: string
  summary: string
  agreements: string[]
  conflicts: ApproachConflict[]
  recommendedStartingPoint?: string
}

type PaperBrief = {
  id?: string
  title: string
  abstract?: string
  venue?: string
  year?: number
  tldr?: Array<{ sentence: string }>
  relevanceReason?: string
}

function fallbackConflicts(query: string, papers: PaperBrief[]): ConflictAnalysis {
  const [a, b] = papers
  if (!a || !b) {
    return {
      query,
      summary: 'Select at least two papers to compare approaches.',
      agreements: [],
      conflicts: [],
    }
  }
  return {
    query,
    summary: `Preliminary contrast between "${a.title}" and "${b.title}" on ${query}. Configure NEBIUS_API_KEY for a full conflict analysis.`,
    agreements: ['Both address the same research question area.'],
    conflicts: [
      {
        id: 'conflict_demo_1',
        topic: 'Methodological approach',
        paperA: {
          id: a.id,
          title: a.title,
          stance: a.relevanceReason || a.tldr?.[0]?.sentence || 'Approach A as presented in the paper.',
        },
        paperB: {
          id: b.id,
          title: b.title,
          stance: b.relevanceReason || b.tldr?.[0]?.sentence || 'Approach B as presented in the paper.',
        },
        whyItMatters: 'Choosing a starting method shapes experiments, assumptions, and what you can claim.',
        prosA: ['Often simpler to implement first', 'Stronger if your setting matches their assumptions'],
        consA: ['May not generalize', 'Could omit mechanisms the other paper emphasizes'],
        prosB: ['May capture effects Approach A misses', 'Useful alternative framing'],
        consB: ['Possibly heavier setup', 'Different evaluation protocol'],
        whenToChooseA: 'You need a fast baseline aligned with A’s setting.',
        whenToChooseB: 'You suspect A’s assumptions fail for your data.',
        confidence: 0.4,
      },
    ],
    recommendedStartingPoint: `Start with the paper closest to your data regime, then stress-test with the other.`,
  }
}

function mechanisticInterpretabilityDemo(
  query: string,
  papers: PaperBrief[]
): ConflictAnalysis | null {
  const circuits = papers.find((paper) => /circuit|interpretability in the wild/i.test(paper.title))
  const sparse = papers.find((paper) => /sparse autoencoder/i.test(paper.title))
  if (!circuits || !sparse || !/mechanistic interpretability/i.test(query)) return null

  return {
    query,
    summary:
      'The papers agree that internal representations can be made legible, but they optimize for different kinds of understanding. Circuit analysis follows a specific behavior end-to-end; sparse autoencoders trade that behavioral specificity for scalable feature discovery.',
    agreements: [
      'Useful explanations require intervention or validation, not visualization alone.',
      'Representations are distributed enough that raw neurons are an unreliable unit of analysis.',
    ],
    conflicts: [
      {
        id: 'demo_unit_of_analysis',
        topic: 'What should be the unit of explanation?',
        paperA: {
          id: circuits.id,
          title: circuits.title,
          stance: 'Trace a behavior through a small, causally validated circuit of heads and components.',
        },
        paperB: {
          id: sparse.id,
          title: sparse.title,
          stance: 'Decompose activations into a large dictionary of sparse, human-interpretable features.',
        },
        whyItMatters:
          'The choice determines whether you get a precise explanation for one behavior or a broad map of reusable concepts.',
        prosA: ['Strong behavioral and causal specificity', 'Clear falsifiable intervention story'],
        consA: ['Labor intensive', 'Often narrow to one task, prompt distribution, or model'],
        prosB: ['Scales to many features and layers', 'Supports broad exploratory audits'],
        consB: ['Feature labels can be subjective', 'Reconstruction quality does not guarantee causal faithfulness'],
        whenToChooseA: 'You need to explain or debug one concrete model behavior.',
        whenToChooseB: 'You need broad coverage before deciding which behaviors deserve a deep causal study.',
        confidence: 0.93,
      },
      {
        id: 'demo_validation_standard',
        topic: 'What counts as a validated explanation?',
        paperA: {
          id: circuits.id,
          title: circuits.title,
          stance: 'Validate by patching or ablating components and measuring the target behavior.',
        },
        paperB: {
          id: sparse.id,
          title: sparse.title,
          stance: 'Validate with reconstruction, sparsity, feature coherence, and targeted activation tests.',
        },
        whyItMatters:
          'A representation can look interpretable without being the mechanism the model actually relies on.',
        prosA: ['Direct causal evidence', 'Evaluation is tied to the behavior being explained'],
        consA: ['Interventions can introduce off-distribution effects', 'Hard to apply at dictionary scale'],
        prosB: ['Quantitative coverage metrics', 'Efficient enough to compare many learned features'],
        consB: ['Proxy metrics can reward plausible but non-causal features', 'Coverage depends on the learned dictionary'],
        whenToChooseA: 'Your claim is causal or safety-critical.',
        whenToChooseB: 'Your goal is scalable discovery and triage, followed by causal validation.',
        confidence: 0.88,
      },
    ],
    recommendedStartingPoint:
      'Use sparse autoencoders to map candidate features, then apply circuit-style interventions to the behaviors that matter.',
  }
}

export async function analyzeApproachConflicts(
  query: string,
  papers: PaperBrief[]
): Promise<ConflictAnalysis> {
  if (papers.length < 2) {
    return {
      query,
      summary: 'Need at least two papers to surface conflicting approaches.',
      agreements: [],
      conflicts: [],
    }
  }

  const demo = mechanisticInterpretabilityDemo(query, papers)
  if (demo) return demo

  if (!isLlmConfigured()) {
    return fallbackConflicts(query, papers)
  }

  const briefs = papers.slice(0, 6).map((p, i) => {
    const tldr = (p.tldr || []).map((t) => t.sentence).join(' ')
    return `${i + 1}. id=${p.id || `p${i}`}
title: ${p.title}
venue/year: ${p.venue || 'n/a'} / ${p.year || 'n/a'}
abstract/tldr: ${(p.abstract || tldr || '').slice(0, 600)}
relevance: ${p.relevanceReason || 'n/a'}`
  })

  const prompt = `You help researchers onboard to a topic by comparing papers that DISAGREE or take different approaches.

Research query: "${query}"

Papers:
${briefs.join('\n\n')}

Return ONLY valid JSON:
{
  "summary": "2-3 sentences on how the literature splits",
  "agreements": ["shared assumptions or findings"],
  "conflicts": [
    {
      "id": "conflict_1",
      "topic": "short name of the disagreement (method, claim, evaluation, ...)",
      "paperA": { "id": "...", "title": "...", "stance": "what this paper argues/does" },
      "paperB": { "id": "...", "title": "...", "stance": "opposing or alternative stance" },
      "whyItMatters": "why a learner must choose deliberately",
      "prosA": ["...", "..."],
      "consA": ["...", "..."],
      "prosB": ["...", "..."],
      "consB": ["...", "..."],
      "whenToChooseA": "concrete situation",
      "whenToChooseB": "concrete situation",
      "confidence": 0.0
    }
  ],
  "recommendedStartingPoint": "one practical next step for an onboarding researcher"
}

Rules:
- Only include REAL tensions (methods, claims, assumptions, metrics) — not trivial differences.
- Prefer 2-4 conflicts.
- Use the given paper ids/titles.
- confidence is 0-1.`

  try {
    const text = await chatCompletion(
      [
        {
          role: 'system',
          content: 'You are a careful scientific mediator. Return only JSON.',
        },
        { role: 'user', content: prompt },
      ],
      { maxTokens: 3500, temperature: 0.2 }
    )
    const raw = extractJsonObject(text) as Partial<ConflictAnalysis>
    return {
      query,
      summary: raw.summary || 'Approaches differ across the selected papers.',
      agreements: raw.agreements || [],
      conflicts: (raw.conflicts || []).map((c, i) => ({
        ...c,
        id: c.id || `conflict_${i + 1}`,
        confidence: typeof c.confidence === 'number' ? c.confidence : 0.6,
        prosA: c.prosA || [],
        consA: c.consA || [],
        prosB: c.prosB || [],
        consB: c.consB || [],
      })),
      recommendedStartingPoint: raw.recommendedStartingPoint,
    }
  } catch (e) {
    console.error('analyzeApproachConflicts error:', e)
    return fallbackConflicts(query, papers)
  }
}
