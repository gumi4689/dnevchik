import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import type { Entry } from '../types'
import styles from './GraphWidget.module.css'

interface GNode {
  id: string
  entry: Entry
  x: number
  y: number
  vx: number
  vy: number
  r: number
  conns: number
}

interface GEdge {
  source: string
  target: string
  strength: number
}

function nodeColor(mood: number | null, conns: number): string {
  if (conns === 0) return '#4a5568'
  if (mood === null) return '#7c6ee0'
  if (mood >= 8) return '#4ade80'
  if (mood >= 6) return '#a78bfa'
  if (mood >= 4) return '#fbbf24'
  return '#f87171'
}

export default function GraphWidget({ entries, onOpenEntry }: {
  entries: Entry[]
  onOpenEntry: (e: Entry) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 500, h: 320 })
  const [tick, setTick] = useState(0)
  const [hovered, setHovered] = useState<string | null>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)

  const nodesRef = useRef<GNode[]>([])
  const edgesRef = useRef<GEdge[]>([])
  const rafRef = useRef<number>(0)
  const settledRef = useRef(false)
  const panningRef = useRef(false)
  const panStartRef = useRef({ mx: 0, my: 0, px: 0, py: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 10 && height > 10) setDims({ w: width, h: height })
    })
    ro.observe(el)
    const r = el.getBoundingClientRect()
    if (r.width > 10) setDims({ w: r.width, h: r.height })
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!entries.length) { nodesRef.current = []; edgesRef.current = []; return }

    const edgeList: GEdge[] = []
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const common = entries[j].tags.filter(t => entries[i].tags.includes(t)).length
        if (common > 0) edgeList.push({ source: entries[i].id, target: entries[j].id, strength: common })
      }
    }

    const cm = new Map<string, number>()
    edgeList.forEach(e => {
      cm.set(e.source, (cm.get(e.source) ?? 0) + 1)
      cm.set(e.target, (cm.get(e.target) ?? 0) + 1)
    })

    const cx = dims.w / 2, cy = dims.h / 2
    const rad = Math.min(dims.w, dims.h) * 0.32
    nodesRef.current = entries.map((entry, i) => {
      const angle = (2 * Math.PI * i) / entries.length
      const conns = cm.get(entry.id) ?? 0
      return {
        id: entry.id, entry,
        x: cx + rad * Math.cos(angle) + (Math.random() - 0.5) * 24,
        y: cy + rad * Math.sin(angle) + (Math.random() - 0.5) * 24,
        vx: 0, vy: 0,
        r: 5 + Math.min(conns * 2, 9),
        conns,
      }
    })
    edgesRef.current = edgeList
    settledRef.current = false
    setPan({ x: 0, y: 0 })
    setScale(1)
  }, [entries, dims.w, dims.h])

  useEffect(() => {
    let frame = 0
    function loop() {
      if (settledRef.current) return
      const nodes = nodesRef.current
      const edges = edgesRef.current
      if (!nodes.length) { rafRef.current = requestAnimationFrame(loop); return }

      frame++
      const cool = Math.max(0.1, 1 - frame / 280)

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j]
          const dx = b.x - a.x, dy = b.y - a.y
          const d2 = dx * dx + dy * dy + 0.01
          const d = Math.sqrt(d2)
          const f = (900 / d2) * cool
          a.vx -= (dx / d) * f; a.vy -= (dy / d) * f
          b.vx += (dx / d) * f; b.vy += (dy / d) * f
        }
      }

      const nm = new Map(nodes.map(n => [n.id, n]))
      for (const e of edges) {
        const a = nm.get(e.source), b = nm.get(e.target)
        if (!a || !b) continue
        const dx = b.x - a.x, dy = b.y - a.y
        const d = Math.sqrt(dx * dx + dy * dy) + 0.01
        const f = (d - 88) * 0.04 * e.strength * cool
        a.vx += (dx / d) * f; a.vy += (dy / d) * f
        b.vx -= (dx / d) * f; b.vy -= (dy / d) * f
      }

      let maxV = 0
      const { w, h } = dims
      for (const n of nodes) {
        n.vx += (w / 2 - n.x) * 0.007 * cool
        n.vy += (h / 2 - n.y) * 0.007 * cool
        n.vx *= 0.82; n.vy *= 0.82
        n.x += n.vx; n.y += n.vy
        n.x = Math.max(n.r + 6, Math.min(w - n.r - 6, n.x))
        n.y = Math.max(n.r + 14, Math.min(h - n.r - 6, n.y))
        maxV = Math.max(maxV, Math.abs(n.vx) + Math.abs(n.vy))
      }

      if (maxV < 0.04 || frame > 600) settledRef.current = true
      setTick(t => t + 1)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [entries, dims])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const f = e.deltaY < 0 ? 1.1 : 0.9
      setScale(s => Math.max(0.15, Math.min(5, s * f)))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const onSvgMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as Element).tagName === 'circle') return
    panningRef.current = true
    panStartRef.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y }
  }, [pan])

  const onSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!panningRef.current) return
    setPan({
      x: panStartRef.current.px + e.clientX - panStartRef.current.mx,
      y: panStartRef.current.py + e.clientY - panStartRef.current.my,
    })
  }, [])

  const onSvgMouseUp = useCallback(() => { panningRef.current = false }, [])

  if (!entries.length) {
    return (
      <div className={styles.wrap} ref={containerRef}>
        <div className={styles.empty}>Нет записей для построения графа</div>
      </div>
    )
  }

  const nodes = nodesRef.current
  const edges = edgesRef.current

  return (
    <div ref={containerRef} className={styles.wrap}>
      <svg
        className={styles.svg}
        width={dims.w}
        height={dims.h}
        onMouseDown={onSvgMouseDown}
        onMouseMove={onSvgMouseMove}
        onMouseUp={onSvgMouseUp}
        onMouseLeave={onSvgMouseUp}
        style={{ cursor: 'grab' }}
        data-tick={tick}
      >
        <defs>
          <filter id="gw-glow-sm" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="gw-glow-lg" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
          {edges.map(edge => {
            const a = nodes.find(n => n.id === edge.source)
            const b = nodes.find(n => n.id === edge.target)
            if (!a || !b) return null
            const hi = hovered === edge.source || hovered === edge.target
            return (
              <line
                key={`${edge.source}-${edge.target}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={hi ? 'var(--accent)' : 'rgba(124,110,224,0.3)'}
                strokeWidth={hi ? 1.5 : 0.8}
                opacity={hi ? 1 : 0.55}
              />
            )
          })}
          {nodes.map(node => {
            const hi = hovered === node.id
            const color = nodeColor(node.entry.mood, node.conns)
            const raw = node.entry.title || 'Без названия'
            const label = raw.length > 16 ? raw.slice(0, 16) + '…' : raw
            return (
              <g key={node.id}>
                {hi && (
                  <circle cx={node.x} cy={node.y} r={node.r + 10} fill={color} opacity={0.12} />
                )}
                <circle
                  className={styles.node}
                  cx={node.x} cy={node.y} r={node.r}
                  fill={color}
                  filter={hi ? 'url(#gw-glow-lg)' : 'url(#gw-glow-sm)'}
                  onClick={() => onOpenEntry(node.entry)}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                />
                <text
                  className={styles.label}
                  x={node.x} y={node.y + node.r + 12}
                  opacity={hi ? 1 : 0.65}
                >
                  {label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      {hovered && (
        <div className={styles.hoverTag}>
          {(nodes.find(n => n.id === hovered)?.entry.title) || 'Без названия'}
        </div>
      )}

      <button
        className={styles.resetBtn}
        onClick={() => { setPan({ x: 0, y: 0 }); setScale(1) }}
        title="Сбросить вид"
      >
        <RotateCcw size={12} />
      </button>
    </div>
  )
}
