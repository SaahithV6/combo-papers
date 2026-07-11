'use client'

import { useEffect, useRef } from 'react'
import { Citation } from '@/lib/types'

interface CitationGraphProps {
  citations: Citation[]
  paperTitle: string
  onCitationClick?: (citation: Citation) => void
  filter?: 'all' | 'foundational' | 'recent'
}

export default function CitationGraph({ citations, paperTitle, onCitationClick, filter = 'all' }: CitationGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredCitations = filter === 'all' 
    ? citations 
    : filter === 'foundational' ? citations.filter(c => c.isFoundational) : citations.filter(c => !c.isFoundational)

  useEffect(() => {
    if (!svgRef.current || !window || filteredCitations.length === 0) return

    const loadD3 = async () => {
      try {
        const d3 = await import('d3')
        const svg = d3.select(svgRef.current!)
        svg.selectAll('*').remove()

        const width = svgRef.current!.clientWidth || 600
        const height = svgRef.current!.clientHeight || 400

        // Create nodes: center node (current paper) + citations
        const nodes = [
          { id: 'current', label: paperTitle, type: 'current', x: width / 2, y: height / 2 },
          ...filteredCitations.map((c, i) => ({
            id: c.id,
            label: c.title.substring(0, 30) + (c.title.length > 30 ? '...' : ''),
            type: c.isFoundational ? 'foundational' : 'related',
            citation: c,
            x: width / 2 + Math.cos((i / filteredCitations.length) * 2 * Math.PI) * 150,
            y: height / 2 + Math.sin((i / filteredCitations.length) * 2 * Math.PI) * 150,
          })),
        ]

        const links = filteredCitations.map(c => ({
          source: 'current',
          target: c.id,
        }))

        type NodeDatum = typeof nodes[number]

        const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
          .force('link', d3.forceLink(links).id((d) => (d as NodeDatum).id).distance(130))
          .force('charge', d3.forceManyBody().strength(-200))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collision', d3.forceCollide(40))

        // Links
        const link = svg.append('g')
          .selectAll('line')
          .data(links)
          .join('line')
          .attr('stroke', '#1a2235')
          .attr('stroke-width', 1)

        // Nodes
        const nodeSelection = svg.append('g')
          .selectAll('g')
          .data(nodes)
          .join('g')
          .attr('cursor', 'pointer') as d3.Selection<SVGGElement, NodeDatum & d3.SimulationNodeDatum, SVGGElement, unknown>

        nodeSelection.call(
          d3.drag<SVGGElement, NodeDatum & d3.SimulationNodeDatum>()
            .on('start', (event, d) => {
              if (!event.active) simulation.alphaTarget(0.3).restart()
              d.fx = d.x
              d.fy = d.y
            })
            .on('drag', (event, d) => {
              d.fx = event.x
              d.fy = event.y
            })
            .on('end', (event, d) => {
              if (!event.active) simulation.alphaTarget(0)
              d.fx = null
              d.fy = null
            })
        )

        const node = nodeSelection

        // Node circles
        node.append('circle')
          .attr('r', (d: NodeDatum) => d.type === 'current' ? 16 : 10)
          .attr('fill', (d: NodeDatum) => {
            if (d.type === 'current') return '#00d4aa'
            if (d.type === 'foundational') return '#f5a623'
            return '#1a2235'
          })
          .attr('stroke', (d: NodeDatum) => d.type === 'current' ? '#00d4aa' : '#9ca3af')
          .attr('stroke-width', (d: NodeDatum) => d.type === 'current' ? 2 : 1)

        // Node labels
        node.append('text')
          .text((d: NodeDatum) => d.label)
          .attr('text-anchor', 'middle')
          .attr('dy', (d: NodeDatum) => d.type === 'current' ? 28 : 22)
          .attr('font-size', '9px')
          .attr('fill', '#9ca3af')
          .attr('font-family', 'IBM Plex Serif, serif')

        node.on('click', (_event: MouseEvent, d: NodeDatum) => {
          if (d.type !== 'current' && 'citation' in d && d.citation) {
            const c = d.citation as Citation
            const rawUrl = c.url || (c.arxivId ? `https://arxiv.org/abs/${c.arxivId}` : undefined)
            if (rawUrl) {
              // Only allow http/https URLs to prevent XSS via javascript: or other protocols
              try {
                const parsed = new URL(rawUrl)
                if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
                  window.open(rawUrl, '_blank', 'noopener,noreferrer')
                }
              } catch {
                // Ignore malformed URLs
              }
            }
            if (onCitationClick) {
              onCitationClick(c)
            }
          }
        })

        simulation.on('tick', () => {
          link
            .attr('x1', (d) => ((d.source as d3.SimulationNodeDatum).x ?? 0))
            .attr('y1', (d) => ((d.source as d3.SimulationNodeDatum).y ?? 0))
            .attr('x2', (d) => ((d.target as d3.SimulationNodeDatum).x ?? 0))
            .attr('y2', (d) => ((d.target as d3.SimulationNodeDatum).y ?? 0))

          node.attr('transform', (d: d3.SimulationNodeDatum) => `translate(${d.x ?? 0},${d.y ?? 0})`)
        })
      } catch (e) {
        console.error('D3 error:', e)
      }
    }

    loadD3()
  }, [filteredCitations, paperTitle, onCitationClick])

  if (citations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: '#9ca3af' }}>
        No citations available
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ backgroundColor: '#0a0e14' }}
      />
    </div>
  )
}
