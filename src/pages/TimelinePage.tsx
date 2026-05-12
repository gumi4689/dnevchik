import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import MoodShape from '../components/MoodShape'
import type { Entry } from '../types'
import styles from './TimelinePage.module.css'

interface Props {
  entries: Entry[]
  onOpenEntry: (entry: Entry) => void
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export default function TimelinePage({ entries, onOpenEntry }: Props) {
  const groups = useMemo(() => {
    const active = entries.filter(e => !e.isArchived)
    const map = new Map<string, Entry[]>()
    for (const e of active) {
      const day = e.createdAt.slice(0, 10)
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(e)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([day, dayEntries]) => ({
        day,
        label: formatDate(day + 'T12:00:00'),
        entries: dayEntries.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      }))
  }, [entries])

  if (entries.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Clock size={15} style={{ color: 'var(--accent)' }} />
          <span className={styles.title}>Хроника</span>
        </div>
        <div className={styles.empty}>
          <Clock size={32} style={{ color: 'var(--text-muted)', marginBottom: 10 }} />
          <p>Пока нет записей</p>
          <span>Начни вести дневник — и здесь появится твоя история</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Clock size={15} style={{ color: 'var(--accent)' }} />
        <span className={styles.title}>Хроника</span>
        <span className={styles.count}>{entries.filter(e => !e.isArchived).length} записей</span>
      </div>

      <div className={styles.scroll}>
        <div className={styles.timeline}>
          {groups.map((group, gi) => (
            <motion.div
              key={group.day}
              className={styles.group}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: gi * 0.04, ease: 'easeOut' as const }}
            >
              <div className={styles.dateRow}>
                <div className={styles.dateLine} />
                <span className={styles.dateLabel}>{group.label}</span>
                <div className={styles.dateLine} />
              </div>

              <div className={styles.dayEntries}>
                {group.entries.map(entry => {
                  const preview = stripHtml(entry.content)
                  return (
                    <motion.article
                      key={entry.id}
                      className={styles.card}
                      onClick={() => onOpenEntry(entry)}
                      whileHover={{ x: 3 }}
                      transition={{ duration: 0.12 }}
                    >
                      <div className={styles.cardLine} style={{
                        background: entry.mood !== null
                          ? entry.mood >= 8 ? '#4ade80'
                          : entry.mood >= 6 ? 'var(--accent)'
                          : entry.mood >= 4 ? '#fbbf24'
                          : '#f87171'
                          : 'var(--border)',
                      }} />
                      <div className={styles.cardBody}>
                        <div className={styles.cardTop}>
                          {entry.mood !== null && (
                            <MoodShape mood={entry.mood} size={20} />
                          )}
                          <div className={styles.cardText}>
                            {entry.title && (
                              <span className={styles.cardTitle}>{entry.title}</span>
                            )}
                            {preview && (
                              <span className={styles.cardPreview}>{preview}</span>
                            )}
                          </div>
                          <span className={styles.cardTime}>{formatTime(entry.createdAt)}</span>
                        </div>
                        {entry.tags.length > 0 && (
                          <div className={styles.cardTags}>
                            {entry.tags.slice(0, 4).map(t => (
                              <span key={t} className={styles.tag}>#{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.article>
                  )
                })}
              </div>
            </motion.div>
          ))}

          <div className={styles.timelineEnd}>
            <span className={styles.timelineEndDot} />
            <span className={styles.timelineEndLabel}>Начало дневника</span>
          </div>
        </div>
      </div>
    </div>
  )
}
