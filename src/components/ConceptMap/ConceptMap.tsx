'use client'

import { useEffect, useRef } from 'react'
import { ConceptMapNode } from '@/lib/types'

interface ConceptMapProps {
  nodes: ConceptMapNode[]
  onNodeClick?: (node: ConceptMapNode) => void
}

const MAX_LABEL_LENGTH = 12

export default function ConceptMap({ nodes, onNodeClick }: ConceptMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const loadD3 = async () => {
      try {
        const d3 = await import('d3')
        const svg = d3.select(svgRef.current!)
        svg.selectAll('*').remove()

        const width = 240
        const height = 200

        // Build simulation nodes (paper node first, then term/rabbithole nodes)
        type SimNode = ConceptMapNode & d3.SimulationNodeDatum
        const simNodes: SimNode[] = nodes.map((n, i) => ({
          ...n,
          x: n.type === 'paper' ? width / 2 : width / 2 + Math.cos((i / nodes.length) * 2 * Math.PI) * 60,
          y: n.type === 'paper' ? height / 2 : height / 2 + Math.sin((i / nodes.length) * 2 * Math.PI) * 60,
        }))

        const paperNode = simNodes.find(n => n.type === 'paper')
        const links = paperNode
          ? simNodes.filter(n => n.id !== paperNode.id).map(n => ({ source: paperNode.id, target: n.id }))
          : []

        const simulation = d3
          .forceSimulation(simNodes)
          .force('link', d3.forceLink(links).id((d) => (d as SimNode).id).distance(55))
          .force('charge', d3.forceManyBody().strength(-80))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collision', d3.forceCollide(18))

        const link = svg
          .append('g')
          .selectAll('line')
          .data(links)
          .join('line')
          .attr('stroke', '#1a2235')
          .attr('stroke-width', 1)

        const nodeG = svg
          .append('g')
          .selectAll('g')
          .data(simNodes)
          .join('g')
          .attr('cursor', 'pointer')
          .on('click', (_event, d) => onNodeClick?.(d as ConceptMapNode)) as d3.Selection<
            SVGGElement,
            SimNode,
            SVGGElement,
            unknown
          >

        nodeG
          .append('circle')
          .attr('r', (d) => (d.type === 'paper' ? 10 : 6))
          .attr('fill', (d) => {
            if (d.type === 'paper') return '#00d4aa'
            if (d.type === 'rabbithole') return '#f5a623'
            return '#1a2235'
          })
          .attr('stroke', (d) => (d.type === 'paper' ? '#00d4aa' : '#9ca3af'))
          .attr('stroke-width', 1)

        nodeG
          .append('text')
          .text((d) => d.label.substring(0, MAX_LABEL_LENGTH) + (d.label.length > MAX_LABEL_LENGTH ? '…' : ''))
          .attr('text-anchor', 'middle')
          .attr('dy', (d) => (d.type === 'paper' ? 20 : 16))
          .attr('font-size', '7px')
          .attr('fill', '#9ca3af')
          .attr('font-family', 'IBM Plex Serif, serif')

        simulation.on('tick', () => {
          link
            .attr('x1', (d) => ((d.source as d3.SimulationNodeDatum).x ?? 0))
            .attr('y1', (d) => ((d.source as d3.SimulationNodeDatum).y ?? 0))
            .attr('x2', (d) => ((d.target as d3.SimulationNodeDatum).x ?? 0))
            .attr('y2', (d) => ((d.target as d3.SimulationNodeDatum).y ?? 0))

          nodeG.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
        })
      } catch (e) {
        console.error('ConceptMap D3 error:', e)
      }
    }

    loadD3()
  }, [nodes, onNodeClick])

  if (nodes.length === 0) return null

  return (
    <div
      className="fixed bottom-4 left-4 z-40 rounded-xl overflow-hidden shadow-xl"
      style={{
        width: 240,
        height: 200,
        backgroundColor: '#0a0e14cc',
        border: '1px solid #1a2235',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="px-2 pt-1.5 pb-0">
        <p className="text-xs font-display uppercase tracking-wider" style={{ color: '#00d4aa', fontSize: '8px' }}>
          Concept Map
        </p>
      </div>
      <svg ref={svgRef} width={240} height={182} style={{ display: 'block' }} />
    </div>
  )
}
