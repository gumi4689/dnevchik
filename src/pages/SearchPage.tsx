import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Frown, Hash, ChevronRight, X, Type } from 'lucide-react'
import type { Entry } from '../types'
import styles from './SearchPage.module.css'

interface Props {
  entries: Entry[]
  onOpenEntry: (entry: Entry, searchQuery: string) => void
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600_000)
  if (h < 1) return 'только что'
  if (h < 24) return `${h}ч назад`
  const d = Math.floor(h / 24)
  return d === 1 ? 'вчера' : `${d}д назад`
}

function countMatches(text: string, query: string): number {
  if (!query.trim()) return 0
  const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  return (text.match(re) || []).length
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(re)
  // Reset lastIndex after split since the regex is stateful
  return (
    <>
      {parts.map((part, i) =>
        new RegExp(`^${escaped}$`, 'i').test(part)
          ? <mark key={i} className={styles.highlight}>{part}</mark>
          : part
      )}
    </>
  )
}

const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const itemVariants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.18 } } }

export default function SearchPage({ entries, onOpenEntry }: Props) {
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [activeWord, setActiveWord] = useState<string | null>(null)
  const [moodFilter, setMoodFilter] = useState<'all' | 'good' | 'neutral' | 'bad' | 'starred'>('all')

  const allTags = useMemo(() => {
    const set = new Set<string>()
    entries.forEach(e => e.tags.forEach(t => set.add(t)))
    return Array.from(set)
  }, [entries])

  // Get deduplicated matched words/phrases from all results
  const matchedWords = useMemo(() => {
    if (!query.trim()) return []
    const words = new Set<string>()
    entries.forEach(e => {
      const text = e.title + ' ' + stripHtml(e.content)
      const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      const matches = text.match(re) || []
      matches.forEach(m => words.add(m.toLowerCase()))
    })
    return Array.from(words).slice(0, 12)
  }, [entries, query])

  const effectiveQuery = activeWord || query

  const results = useMemo(() => {
    let list = entries
    if (activeTag) list = list.filter(e => e.tags.includes(activeTag))
    if (moodFilter === 'good')    list = list.filter(e => e.mood !== null && e.mood >= 7)
    if (moodFilter === 'neutral') list = list.filter(e => e.mood !== null && e.mood >= 4 && e.mood <= 6)
    if (moodFilter === 'bad')     list = list.filter(e => e.mood !== null && e.mood <= 3)
    if (moodFilter === 'starred') list = list.filter(e => e.bookmarked)
    if (!effectiveQuery.trim()) return (activeTag || moodFilter !== 'all') ? list : []
    const q = effectiveQuery.toLowerCase()
    return list.filter(e =>
      e.title.toLowerCase().includes(q) ||
      stripHtml(e.content).toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q))
    )
  }, [entries, effectiveQuery, activeTag, moodFilter])

  const hasQuery = query.trim().length > 0 || activeTag !== null || moodFilter !== 'all'

  return (
    <div className={styles.page}>
      <div className={styles.scroll}>
        <h1 className={styles.title}>Поиск</h1>

        {/* Search input */}
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            autoFocus
            className={styles.searchInput}
            placeholder="Поиск по записям..."
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveWord(null) }}
          />
          {query && (
            <button className={styles.clearBtn} onClick={() => { setQuery(''); setActiveWord(null) }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Mood filter */}
        <div className={styles.moodFilterRow}>
          {(['all','starred','good','neutral','bad'] as const).map(f => (
            <button
              key={f}
              className={`${styles.moodChip} ${moodFilter === f ? styles.moodChipActive : ''}`}
              onClick={() => setMoodFilter(f)}
            >
              {f === 'all' ? 'Все' : f === 'starred' ? '⭐ Избранное' : f === 'good' ? '😊 Хорошо' : f === 'neutral' ? '😐 Норм' : '😔 Плохо'}
            </button>
          ))}
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className={styles.tagRow}>
            {allTags.map(tag => (
              <button
                key={tag}
                className={`${styles.tagChip} ${activeTag === tag ? styles.tagChipActive : ''}`}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              >
                <Hash size={11} />
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Matched words sidebar */}
        {matchedWords.length > 1 && (
          <div className={styles.wordsRow}>
            <Type size={12} className={styles.wordsIcon} />
            <span className={styles.wordsLabel}>Совпадения:</span>
            {matchedWords.map(w => (
              <button
                key={w}
                className={`${styles.wordChip} ${activeWord === w ? styles.wordChipActive : ''}`}
                onClick={() => setActiveWord(activeWord === w ? null : w)}
              >
                {w}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <AnimatePresence mode="wait">
          {!hasQuery ? (
            <motion.div
              key="empty"
              className={styles.emptyState}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Search size={32} className={styles.emptyIcon} />
              <p className={styles.emptyText}>Введите запрос для поиска по записям</p>
            </motion.div>
          ) : results.length === 0 ? (
            <motion.div
              key="noresult"
              className={styles.emptyState}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Frown size={32} className={styles.emptyIcon} />
              <p className={styles.emptyText}>Ничего не найдено</p>
              <p className={styles.emptySub}>Попробуйте другой запрос</p>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              className={styles.results}
              variants={listVariants}
              initial="hidden"
              animate="show"
            >
              <p className={styles.resultsCount}>
                {results.length}{' '}
                {results.length === 1 ? 'запись' : results.length < 5 ? 'записи' : 'записей'}
              </p>
              {results.map(entry => {
                const fullText = stripHtml(entry.content)
                const matchStart = fullText.toLowerCase().indexOf(effectiveQuery.toLowerCase())
                const preview = matchStart >= 0
                  ? fullText.slice(Math.max(0, matchStart - 40), matchStart + 80)
                  : fullText.slice(0, 120)
                const matchCount = countMatches(entry.title + ' ' + fullText, effectiveQuery)
                return (
                  <motion.button
                    key={entry.id}
                    className={styles.resultCard}
                    variants={itemVariants}
                    onClick={() => onOpenEntry(entry, effectiveQuery)}
                    whileHover={{ backgroundColor: 'var(--bg-hover)' }}
                  >
                    <div className={styles.resultBody}>
                      <div className={styles.resultTitleRow}>
                        <p className={styles.resultTitle}>
                          <HighlightedText text={entry.title || 'Без названия'} query={effectiveQuery} />
                        </p>
                        {matchCount > 0 && (
                          <span className={styles.matchBadge}>{matchCount}</span>
                        )}
                      </div>
                      {preview && (
                        <p className={styles.resultPreview}>
                          <HighlightedText text={preview} query={effectiveQuery} />
                        </p>
                      )}
                      <div className={styles.resultMeta}>
                        <span className={styles.resultTime}>{relTime(entry.createdAt)}</span>
                        {entry.tags.map(t => (
                          <span key={t} className={styles.resultTag}>#{t}</span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight size={14} className={styles.resultArrow} />
                  </motion.button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
