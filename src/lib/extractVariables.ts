import Anthropic from '@anthropic-ai/sdk'
import { Variable, NotationWarning, Section } from './types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function extractVariables(
  sections: Section[]
): Promise<{ variables: Variable[]; notationWarnings: NotationWarning[] }> {
  if (!process.env.ANTHROPIC_API_KEY || sections.length === 0) {
    return { variables: [], notationWarnings: [] }
  }

  const sectionText = sections.map(s => ({
    id: s.id,
    title: s.title,
    text: s.content.map(b => b.raw).join(' ').substring(0, 1000),
  }))

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `Analyze variable usage across these paper sections and identify:
1. All mathematical/scientific variables with their definitions
2. Any notation inconsistencies (same symbol used with different meanings in different sections)

Sections:
${JSON.stringify(sectionText, null, 2)}

Return JSON:
{
  "variables": [{"symbol": "x", "name": "input feature", "definition": "...", "units": "...", "firstSeenSectionId": "sec-intro", "allOccurrences": ["sec-intro", "sec-method"]}],
  "notationWarnings": [{"symbol": "x", "sectionA": "sec-intro", "meaningA": "input", "sectionB": "sec-appendix", "meaningB": "output"}]
}

Return ONLY valid JSON.`,
      }],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('extractVariables error:', error)
    return { variables: [], notationWarnings: [] }
  }
}
