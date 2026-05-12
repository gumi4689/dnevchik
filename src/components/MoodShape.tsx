import { motion } from 'framer-motion'

const MOOD_COLORS = [
  '#3d1f6e', '#4a2480', '#5a3099', '#7040b0',
  '#8050c0', '#9060c8', '#a070d0', '#c0a040',
  '#d4b840', '#7ac96a', '#4ade80',
]

function getMoodColor(mood: number): string {
  return MOOD_COLORS[Math.min(mood, 10)]
}

function getMoodPath(mood: number): string {
  const t = mood / 10
  const r = 40

  if (mood <= 2) {
    // острая форма — звезда
    const points = 5
    const outer = r
    const inner = r * 0.4
    let d = ''
    for (let i = 0; i < points * 2; i++) {
      const angle = (Math.PI / points) * i - Math.PI / 2
      const radius = i % 2 === 0 ? outer : inner
      const x = 50 + radius * Math.cos(angle)
      const y = 50 + radius * Math.sin(angle)
      d += (i === 0 ? 'M' : 'L') + `${x},${y} `
    }
    return d + 'Z'
  }

  if (mood <= 5) {
    // угловатый многоугольник
    const sides = 5 - Math.floor(mood / 2)
    const actualSides = Math.max(4, sides + 3)
    let d = ''
    for (let i = 0; i < actualSides; i++) {
      const angle = (2 * Math.PI / actualSides) * i - Math.PI / 2
      const wobble = 1 - (mood / 10) * 0.3
      const x = 50 + r * wobble * Math.cos(angle)
      const y = 50 + r * wobble * Math.sin(angle)
      d += (i === 0 ? 'M' : 'L') + `${x},${y} `
    }
    return d + 'Z'
  }

  if (mood <= 8) {
    // скруглённый квадрат / blob
    const blobR = r * (0.7 + t * 0.3)
    const k = 0.4 + t * 0.4
    return `M ${50},${50 - blobR}
      C ${50 + blobR * k},${50 - blobR} ${50 + blobR},${50 - blobR * k} ${50 + blobR},${50}
      C ${50 + blobR},${50 + blobR * k} ${50 + blobR * k},${50 + blobR} ${50},${50 + blobR}
      C ${50 - blobR * k},${50 + blobR} ${50 - blobR},${50 + blobR * k} ${50 - blobR},${50}
      C ${50 - blobR},${50 - blobR * k} ${50 - blobR * k},${50 - blobR} ${50},${50 - blobR} Z`
  }

  // круг
  return `M ${50},${50 - r} A ${r},${r} 0 1,1 ${50 - 0.001},${50 - r} Z`
}

interface Props {
  mood: number
  size?: number
}

export default function MoodShape({ mood, size = 80 }: Props) {
  const color = getMoodColor(mood)
  const path = getMoodPath(mood)

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      animate={{ rotate: [0, 5, -5, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <motion.path
        d={path}
        fill={color}
        filter="url(#glow)"
        animate={{ d: path, fill: color }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        style={{ opacity: 0.9 }}
      />
    </motion.svg>
  )
}
