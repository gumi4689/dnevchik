import { motion } from 'framer-motion'
import { Share2 } from 'lucide-react'
import GraphWidget from '../components/GraphWidget'
import type { Entry } from '../types'
import styles from './GraphPage.module.css'

interface Props {
  entries: Entry[]
  onOpenEntry: (entry: Entry) => void
}

export default function GraphPage({ entries, onOpenEntry }: Props) {
  return (
    <motion.div
      className={styles.page}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className={styles.header}>
        <Share2 size={15} style={{ color: 'var(--accent)' }} />
        <span className={styles.title}>Граф записей</span>
        {entries.length > 0 && (
          <span className={styles.hint}>
            Узлы связаны общими тегами · колёсико мыши = масштаб · перетяни = пан
          </span>
        )}
      </div>
      <div className={styles.canvas}>
        <GraphWidget entries={entries} onOpenEntry={onOpenEntry} />
      </div>
    </motion.div>
  )
}
