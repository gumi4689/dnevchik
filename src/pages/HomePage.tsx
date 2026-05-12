import { useState, useMemo } from 'react'
import { motion, type Variants } from 'framer-motion'
import { PenSquare, Flame, BookOpen, ChevronRight, BarChart2, RefreshCw, Pencil, History } from 'lucide-react'
import { useGreeting } from '../hooks/useGreeting'
import MoodShape from '../components/MoodShape'
import { getDailyPrompt, PROMPTS } from '../data/prompts'
import type { Entry, Tab, AppSettings } from '../types'
import styles from './HomePage.module.css'

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600_000)
  if (h < 1) return 'только что'
  if (h < 24) return `${h}ч назад`
  const d = Math.floor(h / 24)
  return d === 1 ? 'вчера' : `${d}д назад`
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function calcStreak(entries: Entry[]): number {
  if (!entries.length) return 0
  const days = new Set(entries.map(e => e.createdAt.slice(0, 10)))
  let streak = 0
  const d = new Date()
  while (true) {
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    if (!days.has(key)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
}

interface Props {
  entries: Entry[]
  onTabChange: (tab: Tab) => void
  settings: AppSettings
  onOpenEntry: (entry: Entry) => void
  onStatsClick: () => void
  onNewWithPrompt: (prompt: string) => void
}

export default function HomePage({ entries, onTabChange, settings, onOpenEntry, onStatsClick, onNewWithPrompt }: Props) {
  const greeting = useGreeting()
  const userName = localStorage.getItem('user_name')
  const recent = entries.filter(e => !e.isArchived).slice(0, 10)

  const todayStr = new Date().toISOString().slice(0, 10)
  const hasEntryToday = entries.some(e => e.createdAt.slice(0, 10) === todayStr)
  const [promptSeed, setPromptSeed] = useState(0)
  const prompt = getDailyPrompt(promptSeed)

  const yearAgo = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 1)
    const key = d.toISOString().slice(0, 10)
    return entries.find(e => e.createdAt.slice(0, 10) === key) ?? null
  }, [entries])
  const avgMood = entries.length
    ? Math.round(entries.reduce((s, e) => s + (e.mood ?? 5), 0) / entries.length)
    : 5
  const streak = calcStreak(entries)

  return (
    <div className={styles.page}>
      <div className={styles.statusBar}>
        <span className={styles.statusDot} />
        <span className={styles.statusText}>Локальный режим</span>
      </div>

      <div className={styles.scroll}>
        {/* Приветствие */}
        <motion.section
          className={styles.greetSection}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className={styles.greetRow}>
            <div>
              <h1 className={styles.greeting}>
                {greeting}{userName ? `, ${userName}` : ''}
              </h1>
              <p className={styles.greetDate}>
                {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            {settings.showMoodOnHome && entries.length > 0 && (
              <div className={styles.moodWidget}>
                <MoodShape mood={avgMood} size={44} />
                <span className={styles.moodNum}>{avgMood}</span>
              </div>
            )}
          </div>

          {/* Статистика */}
          <button className={styles.stats} onClick={onStatsClick} title="Открыть статистику">
            <div className={styles.statItem}>
              <BookOpen size={13} className={styles.statIcon} />
              <span className={styles.statVal}>{entries.length}</span>
              <span className={styles.statLabel}>записей</span>
            </div>
            <div className={styles.statItem}>
              <Flame size={13} className={styles.statIcon} style={{ color: '#f59e0b' }} />
              <span className={styles.statVal}>{streak}</span>
              <span className={styles.statLabel}>дней подряд</span>
            </div>
            <div className={styles.statItemArrow}>
              <BarChart2 size={12} />
            </div>
          </button>
        </motion.section>

        {/* Кнопка создания */}
        <motion.button
          className={styles.newBtn}
          onClick={() => onTabChange('new')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          whileTap={{ scale: 0.97 }}
        >
          <PenSquare size={15} />
          Новая запись
        </motion.button>

        {/* Подсказка для записи */}
        {!hasEntryToday && (
          <motion.div
            className={styles.promptCard}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.2 }}
          >
            <p className={styles.promptText}>«{prompt}»</p>
            <div className={styles.promptActions}>
              <button
                className={styles.promptWrite}
                onClick={() => onNewWithPrompt(prompt)}
              >
                <Pencil size={12} />
                Написать об этом
              </button>
              <button
                className={styles.promptRefresh}
                onClick={() => setPromptSeed(s => (s + 1) % PROMPTS.length)}
                title="Другой вопрос"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Год назад */}
        {yearAgo && (
          <motion.div
            className={styles.yearAgoCard}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => onOpenEntry(yearAgo)}
          >
            <div className={styles.yearAgoHeader}>
              <History size={12} />
              <span>Год назад — {new Date(yearAgo.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
            </div>
            <p className={styles.yearAgoText}>
              {yearAgo.title || stripHtml(yearAgo.content).slice(0, 80) || '(без текста)'}
            </p>
          </motion.div>
        )}

        {/* Список записей */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Последние</h2>
          {recent.length === 0 ? (
            <motion.div
              className={styles.emptyState}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <BookOpen size={28} className={styles.emptyIcon} />
              <p className={styles.emptyText}>Записей пока нет</p>
              <p className={styles.emptySub}>Нажмите «Новая запись», чтобы начать</p>
            </motion.div>
          ) : (
            <motion.div
              className={styles.entries}
              variants={listVariants}
              initial="hidden"
              animate="show"
            >
              {recent.map(entry => (
                <motion.article
                  key={entry.id}
                  className={styles.entry}
                  variants={itemVariants}
                  whileHover={{ backgroundColor: 'var(--bg-hover)' }}
                  onClick={() => onOpenEntry(entry)}
                >
                  <div className={styles.entryMain}>
                    {entry.mood !== null && (
                      <div className={styles.entryMood}>
                        <MoodShape mood={entry.mood} size={22} />
                      </div>
                    )}
                    <div className={styles.entryBody}>
                      {entry.title && <p className={styles.entryTitle}>{entry.title}</p>}
                      <p className={styles.entryPreview}>{stripHtml(entry.content)}</p>
                      <div className={styles.entryMeta}>
                        <span className={styles.entryTime}>{relTime(entry.createdAt)}</span>
                        {entry.tags.map(t => (
                          <span key={t} className={styles.entryTag}>#{t}</span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight size={14} className={styles.entryArrow} />
                  </div>
                </motion.article>
              ))}
            </motion.div>
          )}
        </section>
      </div>
    </div>
  )
}
