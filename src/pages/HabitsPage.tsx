import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Check, Flame, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Habit, HabitLog } from '../types'
import styles from './HabitsPage.module.css'

const EMOJI_OPTIONS = ['💧','🏃','📚','🧘','🥗','😴','✍️','💊','🚶','🎵','🌿','💪','🧹','🛁','☀️']
const COLOR_OPTIONS = ['#7c6ee0','#4ade80','#f59e0b','#ef4444','#38bdf8','#fb7185','#a78bfa','#34d399']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function getWeekDays(offsetWeek = 0): string[] {
  const now = new Date()
  const dayOfWeek = (now.getDay() + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek + offsetWeek * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function loadHabits(): Habit[] {
  try { return JSON.parse(localStorage.getItem('dnevchik_habits') ?? '[]') } catch { return [] }
}

function saveHabits(h: Habit[]) {
  localStorage.setItem('dnevchik_habits', JSON.stringify(h))
}

function loadLogs(): HabitLog[] {
  try { return JSON.parse(localStorage.getItem('dnevchik_habit_logs') ?? '[]') } catch { return [] }
}

function saveLogs(l: HabitLog[]) {
  localStorage.setItem('dnevchik_habit_logs', JSON.stringify(l))
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>(loadHabits)
  const [logs, setLogs] = useState<HabitLog[]>(loadLogs)
  const [weekOffset, setWeekOffset] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('💧')
  const [newColor, setNewColor] = useState('#7c6ee0')

  const weekDays = getWeekDays(weekOffset)
  const today = todayStr()

  function toggleLog(habitId: string, date: string) {
    if (date > today) return
    const idx = logs.findIndex(l => l.habitId === habitId && l.date === date)
    let next: HabitLog[]
    if (idx >= 0) {
      next = logs.filter((_, i) => i !== idx)
    } else {
      next = [...logs, { habitId, date }]
    }
    setLogs(next)
    saveLogs(next)
  }

  function isDone(habitId: string, date: string) {
    return logs.some(l => l.habitId === habitId && l.date === date)
  }

  function addHabit() {
    if (!newName.trim()) return
    const habit: Habit = { id: crypto.randomUUID(), name: newName.trim(), emoji: newEmoji, color: newColor }
    const next = [...habits, habit]
    setHabits(next)
    saveHabits(next)
    setNewName('')
    setShowAdd(false)
  }

  function removeHabit(id: string) {
    const next = habits.filter(h => h.id !== id)
    setHabits(next)
    saveHabits(next)
    const nextLogs = logs.filter(l => l.habitId !== id)
    setLogs(nextLogs)
    saveLogs(nextLogs)
  }

  const streaks = useMemo(() => {
    const result: Record<string, number> = {}
    for (const h of habits) {
      let streak = 0
      const d = new Date(today)
      while (true) {
        const key = d.toISOString().slice(0, 10)
        if (!logs.some(l => l.habitId === h.id && l.date === key)) break
        streak++
        d.setDate(d.getDate() - 1)
      }
      result[h.id] = streak
    }
    return result
  }, [habits, logs, today])

  const isCurrentWeek = weekOffset === 0
  const weekLabel = isCurrentWeek
    ? 'Эта неделя'
    : weekOffset === -1 ? 'Прошлая неделя'
    : `${weekDays[0].slice(5).replace('-', '/')} – ${weekDays[6].slice(5).replace('-', '/')}`

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Flame size={15} style={{ color: 'var(--accent)' }} />
        <span className={styles.title}>Привычки</span>
        <button className={styles.addBtn} onClick={() => setShowAdd(v => !v)}>
          <Plus size={14} />
        </button>
      </div>

      {/* Навигация по неделям */}
      <div className={styles.weekNav}>
        <button className={styles.weekBtn} onClick={() => setWeekOffset(o => o - 1)}>
          <ChevronLeft size={14} />
        </button>
        <span className={styles.weekLabel}>{weekLabel}</span>
        <button className={styles.weekBtn} onClick={() => setWeekOffset(o => Math.min(o + 1, 0))} disabled={isCurrentWeek}>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Добавление привычки */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            className={styles.addForm}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className={styles.addRow}>
              <input
                className={styles.addInput}
                placeholder="Название привычки"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addHabit()}
                autoFocus
              />
            </div>
            <div className={styles.emojiRow}>
              {EMOJI_OPTIONS.map(e => (
                <button key={e} className={`${styles.emojiBtn} ${newEmoji === e ? styles.emojiBtnActive : ''}`} onClick={() => setNewEmoji(e)}>{e}</button>
              ))}
            </div>
            <div className={styles.colorRow}>
              {COLOR_OPTIONS.map(c => (
                <button key={c} className={`${styles.colorBtn} ${newColor === c ? styles.colorBtnActive : ''}`}
                  style={{ background: c }} onClick={() => setNewColor(c)} />
              ))}
            </div>
            <button className={styles.saveBtn} onClick={addHabit}>Добавить</button>
          </motion.div>
        )}
      </AnimatePresence>

      {habits.length === 0 ? (
        <div className={styles.empty}>
          <Flame size={28} style={{ color: 'var(--text-muted)' }} />
          <p>Нет привычек</p>
          <span>Нажми «+» чтобы добавить первую</span>
        </div>
      ) : (
        <div className={styles.table}>
          {/* Заголовок */}
          <div className={styles.tableHead}>
            <div className={styles.habitCol} />
            {weekDays.map((d, i) => (
              <div key={d} className={`${styles.dayCol} ${d === today ? styles.dayColToday : ''}`}>
                <span className={styles.dayName}>{DAYS_SHORT[i]}</span>
                <span className={styles.dayNum}>{d.slice(8)}</span>
              </div>
            ))}
            <div className={styles.streakCol}>🔥</div>
          </div>

          {/* Строки привычек */}
          {habits.map(habit => (
            <motion.div
              key={habit.id}
              className={styles.habitRow}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className={styles.habitCol}>
                <span className={styles.habitEmoji}>{habit.emoji}</span>
                <span className={styles.habitName}>{habit.name}</span>
                <button className={styles.removeBtn} onClick={() => removeHabit(habit.id)}>
                  <X size={10} />
                </button>
              </div>
              {weekDays.map(d => {
                const done = isDone(habit.id, d)
                const future = d > today
                return (
                  <div key={d} className={styles.dayCol}>
                    <button
                      className={`${styles.checkBtn} ${done ? styles.checkBtnDone : ''} ${future ? styles.checkBtnFuture : ''}`}
                      style={done ? { background: habit.color, borderColor: habit.color } : {}}
                      onClick={() => toggleLog(habit.id, d)}
                      disabled={future}
                    >
                      {done && <Check size={10} />}
                    </button>
                  </div>
                )
              })}
              <div className={styles.streakCol}>
                <span className={styles.streakNum} style={{ color: streaks[habit.id] > 0 ? habit.color : 'var(--text-muted)' }}>
                  {streaks[habit.id]}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
