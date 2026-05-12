import { useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart2, BookOpen, Flame, Smile, Calendar } from 'lucide-react'
import GraphWidget from '../components/GraphWidget'
import type { Entry } from '../types'
import styles from './StatsPage.module.css'

function WordCloud({ entries }: { entries: Entry[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const words = useMemo(() => {
    const freq = new Map<string, number>()
    const stopWords = new Set(['и','в','на','с','по','к','из','у','за','от','до','для','как','но','а','не','что','это','бы','же','так','об','все','всё','был','была','было','или','при','его','её','их','мне','мой','моя','моё','меня','когда','уже','ещё','тоже','очень','только','даже','вот','он','она','они','они','я','мы','вы','ты','то','те'])
    entries.forEach(e => {
      const text = (e.title + ' ' + e.content).replace(/<[^>]*>/g, ' ').toLowerCase()
      const ws = text.match(/[а-яё]{3,}/g) ?? []
      ws.forEach(w => { if (!stopWords.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1) })
    })
    return Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 60)
  }, [entries])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !words.length) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)
    const maxFreq = words[0][1]
    const colors = ['#7c6ee0','#4ade80','#fbbf24','#f87171','#38bdf8','#a78bfa','#34d399','#fb7185']
    const placed: { x: number; y: number; w: number; h: number }[] = []

    for (const [word, freq] of words) {
      const size = Math.round(11 + (freq / maxFreq) * 26)
      ctx.font = `${size}px Inter, system-ui, sans-serif`
      const tw = ctx.measureText(word).width
      let found = false
      for (let attempt = 0; attempt < 100; attempt++) {
        const x = 20 + Math.random() * (W - tw - 40)
        const y = size + Math.random() * (H - size - 20)
        const overlap = placed.some(p => x < p.x + p.w + 6 && x + tw > p.x - 6 && y < p.y + 6 && y - size > p.y - p.h - 6)
        if (!overlap) {
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)]
          ctx.globalAlpha = 0.55 + (freq / maxFreq) * 0.45
          ctx.fillText(word, x, y)
          placed.push({ x, y: y - size, w: tw, h: size })
          found = true
          break
        }
      }
      if (!found && placed.length > 40) break
    }
    ctx.globalAlpha = 1
  }, [words])

  if (!words.length) return null

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={200}
      style={{ width: '100%', height: 200, borderRadius: 'var(--radius-md)' }}
    />
  )
}

interface Props {
  entries: Entry[]
  onOpenEntry: (entry: Entry) => void
}

const MONTHS_RU = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const, delay } },
  }
}

export default function StatsPage({ entries, onOpenEntry }: Props) {
  const today = new Date()
  const todayStr = toDateStr(today)

  // ── Summary stats ──────────────────────────────────────────────────────────
  const { thisMonth, avgMood, streak } = useMemo(() => {
    const cy = today.getFullYear()
    const cm = today.getMonth()

    const thisMonth = entries.filter(e => {
      const d = new Date(e.createdAt)
      return d.getFullYear() === cy && d.getMonth() === cm
    }).length

    const moodEntries = entries.filter(e => e.mood !== null)
    const avgMood =
      moodEntries.length === 0
        ? null
        : Math.round((moodEntries.reduce((s, e) => s + (e.mood as number), 0) / moodEntries.length) * 10) / 10

    // Days with entries
    const daysWithEntries = new Set(entries.map(e => e.createdAt.slice(0, 10)))
    let streak = 0
    const cur = new Date(today)
    while (true) {
      if (daysWithEntries.has(toDateStr(cur))) {
        streak++
        cur.setDate(cur.getDate() - 1)
      } else {
        break
      }
    }

    return { thisMonth, avgMood, streak }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, todayStr])

  // ── Mood chart — last 30 days ──────────────────────────────────────────────
  const moodDays = useMemo(() => {
    const result: { label: string; avg: number | null }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = toDateStr(d)
      const dayEntries = entries.filter(e => e.createdAt.slice(0, 10) === key && e.mood !== null)
      const avg =
        dayEntries.length === 0
          ? null
          : dayEntries.reduce((s, e) => s + (e.mood as number), 0) / dayEntries.length
      result.push({ label: `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`, avg })
    }
    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, todayStr])

  // ── Monthly entries — last 6 months ───────────────────────────────────────
  const monthData = useMemo(() => {
    const result: { label: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth()
      const count = entries.filter(e => {
        const ed = new Date(e.createdAt)
        return ed.getFullYear() === y && ed.getMonth() === m
      }).length
      result.push({ label: `${MONTHS_RU[m]} ${y}`, count })
    }
    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, todayStr])

  const maxMonthCount = useMemo(() => Math.max(1, ...monthData.map(m => m.count)), [monthData])

  // ── Tag frequency ──────────────────────────────────────────────────────────
  const topTags = useMemo(() => {
    const freq = new Map<string, number>()
    entries.forEach(e => e.tags.forEach(t => freq.set(t, (freq.get(t) ?? 0) + 1)))
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
  }, [entries])

  // ── Activity heatmap — last 84 days (12 weeks × 7) ────────────────────────
  const heatmap = useMemo(() => {
    // Build 84-cell grid: col = week (0..11), row = day-of-week (0=Mon..6=Sun)
    // Start from (today - 83 days), aligning so today is at bottom-right
    const cells: { key: string; count: number; weekIdx: number; dayIdx: number }[] = []
    const todayDow = (today.getDay() + 6) % 7 // Mon=0
    // total cells = 84, last cell is today
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = toDateStr(d)
      const count = entries.filter(e => e.createdAt.slice(0, 10) === key).length
      const cellIndex = 83 - i
      const col = Math.floor(cellIndex / 7)
      const row = cellIndex % 7
      cells.push({ key, count, weekIdx: col, dayIdx: row })
    }

    // Month labels: for each week col, determine the month of its Monday
    const monthLabels: { col: number; label: string }[] = []
    let lastMonth = -1
    for (let col = 0; col < 12; col++) {
      const daysAgo = 83 - col * 7
      const d = new Date(today)
      d.setDate(d.getDate() - daysAgo)
      if (d.getMonth() !== lastMonth) {
        monthLabels.push({ col, label: MONTHS_RU[d.getMonth()] })
        lastMonth = d.getMonth()
      }
    }

    return { cells, monthLabels, todayDow }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, todayStr])

  // ── Empty state ────────────────────────────────────────────────────────────
  if (entries.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.scroll}>
          <motion.div
            className={styles.emptyState}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <BarChart2 size={48} className={styles.emptyIcon} />
            <p className={styles.emptyText}>Нет данных. Начните вести дневник!</p>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.scroll}>
        {/* Header */}
        <motion.div
          className={styles.header}
          {...fadeUp(0)}
        >
          <BarChart2 size={20} className={styles.headerIcon} />
          <h1 className={styles.title}>Статистика</h1>
        </motion.div>

        {/* Summary grid */}
        <motion.div
          className={styles.statsGrid}
          {...fadeUp(0.07)}
        >
          <div className={styles.statCard}>
            <div className={styles.statCardIcon}><BookOpen size={16} /></div>
            <div className={styles.statNum}>{entries.length}</div>
            <div className={styles.statLabel}>Всего записей</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statCardIcon}><Calendar size={16} /></div>
            <div className={styles.statNum}>{thisMonth}</div>
            <div className={styles.statLabel}>Этот месяц</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statCardIcon}><Smile size={16} /></div>
            <div className={styles.statNum}>{avgMood !== null ? avgMood : '—'}</div>
            <div className={styles.statLabel}>Среднее настроение</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statCardIcon} style={{ color: 'var(--warning)' }}><Flame size={16} /></div>
            <div className={styles.statNum}>{streak}</div>
            <div className={styles.statLabel}>Серия дней</div>
          </div>
        </motion.div>

        {/* Mood chart */}
        <AnimatePresence>
          <motion.section
            className={styles.section}
            {...fadeUp(0.14)}
          >
            <h2 className={styles.sectionTitle}>Настроение за 30 дней</h2>
            <div className={styles.moodChart}>
              {moodDays.map((day, i) => (
                <div key={i} className={styles.moodBarWrap}>
                  <div
                    className={styles.moodBar}
                    style={{ height: day.avg !== null ? `${(day.avg / 10) * 100}%` : '4px' }}
                    title={day.avg !== null ? `${day.label}: ${day.avg.toFixed(1)}` : day.label}
                    data-empty={day.avg === null ? 'true' : undefined}
                  />
                  {i % 5 === 0 && (
                    <span className={styles.moodBarLabel}>{day.label}</span>
                  )}
                </div>
              ))}
            </div>
          </motion.section>
        </AnimatePresence>

        {/* Monthly chart */}
        <motion.section
          className={styles.section}
          {...fadeUp(0.21)}
        >
          <h2 className={styles.sectionTitle}>Записей по месяцам</h2>
          <div className={styles.monthChart}>
            {monthData.map((m, i) => (
              <div key={i} className={styles.monthRow}>
                <span className={styles.monthLabel}>{m.label}</span>
                <div className={styles.monthBarTrack}>
                  <div
                    className={styles.monthBar}
                    style={{ width: `${(m.count / maxMonthCount) * 100}%` }}
                  />
                </div>
                <span className={styles.monthCount}>{m.count}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Tag pills */}
        {topTags.length > 0 && (
          <motion.section
            className={styles.section}
            {...fadeUp(0.28)}
          >
            <h2 className={styles.sectionTitle}>Популярные теги</h2>
            <div className={styles.tagsWrap}>
              {topTags.map(([tag, count]) => (
                <div key={tag} className={styles.tagPill}>
                  <span className={styles.tagName}>#{tag}</span>
                  <span className={styles.tagBadge}>{count}</span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Activity heatmap */}
        <motion.section
          className={styles.section}
          {...fadeUp(0.35)}
        >
          <h2 className={styles.sectionTitle}>Активность</h2>
          <div className={styles.heatmapWrap}>
            {/* Month labels row */}
            <div className={styles.heatmapMonths}>
              {heatmap.monthLabels.map(({ col, label }) => (
                <span
                  key={col}
                  className={styles.heatmapMonthLabel}
                  style={{ gridColumn: col + 1 }}
                >
                  {label}
                </span>
              ))}
            </div>
            {/* Grid: 12 cols × 7 rows */}
            <div className={styles.heatmap}>
              {heatmap.cells.map(({ key, count, weekIdx, dayIdx }) => (
                <div
                  key={key}
                  className={styles.heatCell}
                  style={{
                    gridColumn: weekIdx + 1,
                    gridRow: dayIdx + 1,
                  }}
                  data-level={count === 0 ? '0' : count === 1 ? '1' : '2'}
                  title={`${key}: ${count} записей`}
                />
              ))}
            </div>
          </div>
        </motion.section>

        {/* Word cloud */}
        {entries.length >= 3 && (
          <motion.section className={styles.section} {...fadeUp(0.38)}>
            <h2 className={styles.sectionTitle}>Облако слов</h2>
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '10px', border: '1px solid var(--border)' }}>
              <WordCloud entries={entries} />
            </div>
          </motion.section>
        )}

        {/* Graph */}
        {entries.length >= 2 && (
          <motion.section
            className={styles.section}
            {...fadeUp(0.42)}
          >
            <h2 className={styles.sectionTitle}>Граф записей</h2>
            <GraphWidget entries={entries} onOpenEntry={onOpenEntry} />
          </motion.section>
        )}
      </div>
    </div>
  )
}
