import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, CalendarDays, PenSquare } from 'lucide-react'
import type { Entry } from '../types'
import styles from './CalendarPage.module.css'

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const DAYS_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

interface Props {
  entries: Entry[]
  onOpenEntry: (entry: Entry) => void
}

export default function CalendarPage({ entries, onOpenEntry }: Props) {
  const today = new Date()
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = current.getFullYear()
  const month = current.getMonth()

  function prevMonth() { setCurrent(new Date(year, month - 1, 1)); setSelectedDate(null) }
  function nextMonth() { setCurrent(new Date(year, month + 1, 1)); setSelectedDate(null) }
  function goToday() { setCurrent(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(null) }

  // Build calendar grid (6 weeks × 7 days)
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7  // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7

  // Group entries by date YYYY-MM-DD
  const byDate = new Map<string, Entry[]>()
  entries.forEach(e => {
    const d = e.createdAt.slice(0, 10)
    if (!byDate.has(d)) byDate.set(d, [])
    byDate.get(d)!.push(e)
  })

  const cells: { date: string; day: number; inMonth: boolean }[] = []
  for (let i = 0; i < totalCells; i++) {
    const offset = i - firstDow
    let day: number
    let inMonth: boolean
    if (offset < 0) { day = daysInPrev + offset + 1; inMonth = false }
    else if (offset >= daysInMonth) { day = offset - daysInMonth + 1; inMonth = false }
    else { day = offset + 1; inMonth = true }
    const d = inMonth
      ? `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      : ''
    cells.push({ date: d, day, inMonth })
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  const selectedEntries = selectedDate ? (byDate.get(selectedDate) ?? []) : []

  function getMoodColor(mood: number | null): string {
    if (mood === null) return 'var(--text-muted)'
    if (mood <= 2) return '#9333ea'
    if (mood <= 5) return 'var(--text-secondary)'
    if (mood <= 8) return 'var(--warning)'
    return 'var(--success)'
  }

  return (
    <div className={styles.page}>
      <div className={styles.scroll}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Календарь</h1>
          <div className={styles.nav}>
            <button className={styles.navBtn} onClick={prevMonth}><ChevronLeft size={16}/></button>
            <motion.span
              key={`${year}-${month}`}
              className={styles.monthLabel}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              {MONTHS_RU[month]} {year}
            </motion.span>
            <button className={styles.navBtn} onClick={nextMonth}><ChevronRight size={16}/></button>
            <button className={styles.todayBtn} onClick={goToday}>Сегодня</button>
          </div>
        </div>

        {/* Grid */}
        <div className={styles.grid}>
          {DAYS_RU.map(d => (
            <div key={d} className={styles.dayHeader}>{d}</div>
          ))}
          {cells.map((cell, i) => {
            const hasEntries = cell.date ? byDate.has(cell.date) : false
            const isToday = cell.date === todayStr
            const isSelected = cell.date === selectedDate
            const count = cell.date ? (byDate.get(cell.date)?.length ?? 0) : 0
            return (
              <motion.button
                key={i}
                className={`${styles.cell} ${!cell.inMonth ? styles.cellOther : ''} ${isToday ? styles.cellToday : ''} ${isSelected ? styles.cellSelected : ''}`}
                onClick={() => cell.inMonth && cell.date && setSelectedDate(cell.date === selectedDate ? null : cell.date)}
                whileTap={cell.inMonth ? { scale: 0.93 } : {}}
              >
                <span className={styles.cellDay}>{cell.day}</span>
                {hasEntries && (
                  <div className={styles.dots}>
                    {Array.from({ length: Math.min(count, 3) }, (_, di) => (
                      <span key={di} className={styles.dot} />
                    ))}
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Selected day entries */}
        <AnimatePresence>
          {selectedDate && (
            <motion.div
              className={styles.dayPanel}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.dayPanelHeader}>
                <CalendarDays size={14} />
                <span>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </span>
                <span className={styles.entryCount}>{selectedEntries.length} {selectedEntries.length === 1 ? 'запись' : 'записей'}</span>
              </div>
              {selectedEntries.length === 0 ? (
                <p className={styles.noEntries}>Нет записей за этот день</p>
              ) : (
                <div className={styles.entryList}>
                  {selectedEntries.map(entry => (
                    <motion.button
                      key={entry.id}
                      className={styles.entryCard}
                      onClick={() => onOpenEntry(entry)}
                      whileHover={{ backgroundColor: 'var(--bg-hover)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className={styles.entryCardLeft}>
                        <span className={styles.moodDot} style={{ background: getMoodColor(entry.mood) }} />
                        <div>
                          <p className={styles.entryTitle}>{entry.title || 'Без названия'}</p>
                          <p className={styles.entryTime}>
                            {new Date(entry.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <PenSquare size={13} className={styles.entryArrow} />
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {entries.length === 0 && (
          <motion.div
            className={styles.emptyState}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <CalendarDays size={32} className={styles.emptyIcon} />
            <p className={styles.emptyText}>Записей пока нет.</p>
            <p className={styles.emptySub}>Начните вести дневник — и здесь появится ваша история.</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
