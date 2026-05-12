import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, PenLine, Search, Settings, BarChart2,
  Smile, Flame,
  Plus, X, Share2, Clock, Dumbbell,
} from 'lucide-react'
import MoodShape from './MoodShape'
import type { Tab, Widget, AppSettings } from '../types'
import styles from './SideNav.module.css'

const NAV_ITEMS: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: 'home',     icon: <Home size={20} />,     label: 'Главная' },
  { id: 'new',      icon: <PenLine size={20} />,  label: 'Запись' },
  { id: 'search',   icon: <Search size={20} />,   label: 'Поиск' },
  { id: 'timeline', icon: <Clock size={20} />,    label: 'Хроника' },
  { id: 'habits',   icon: <Dumbbell size={20} />, label: 'Привычки' },
  { id: 'graph',    icon: <Share2 size={20} />,   label: 'Граф' },
  { id: 'settings', icon: <Settings size={20} />, label: 'Настройки' },
]

const ALL_WIDGETS: { id: Widget; icon: React.ReactNode; label: string }[] = [
  { id: 'mood',   icon: <Smile size={18} />,     label: 'Настроение' },
  { id: 'stats',  icon: <BarChart2 size={18} />, label: 'Статистика' },
  { id: 'streak', icon: <Flame size={18} />,     label: 'Серия дней' },
]

const MIN_WIDTH = 52
const MAX_WIDTH = 220

interface WidgetPanelProps {
  id: Widget
  onClose: () => void
  position: 'left' | 'right'
  sidebarWidth: number
  onNewWithNote?: (content: string) => void
}

function WidgetPanel({ id, onClose, position, sidebarWidth, onNewWithNote }: WidgetPanelProps) {
  const [mood, setMood] = useState(5)
  const [quickNote, setQuickNote] = useState('')
  const offset = `${sidebarWidth + 6}px`

  return (
    <motion.div
      className={styles.widgetPanel}
      style={position === 'left' ? { left: offset } : { right: offset }}
      initial={{ opacity: 0, x: position === 'left' ? -12 : 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: position === 'left' ? -12 : 12 }}
      transition={{ duration: 0.18, ease: 'easeOut' as const }}
    >
      <div className={styles.widgetHeader}>
        <span className={styles.widgetTitle}>
          {ALL_WIDGETS.find(w => w.id === id)?.label}
        </span>
        <button className={styles.widgetClose} onClick={onClose}>
          <X size={13} />
        </button>
      </div>

      {id === 'mood' && (
        <div className={styles.widgetBody}>
          <div className={styles.moodCenter}>
            <MoodShape mood={mood} size={56} />
            <span className={styles.moodVal}>{mood} / 10</span>
          </div>
          <input
            type="range" min={0} max={10} value={mood}
            className={styles.moodSlider}
            onChange={e => setMood(Number(e.target.value))}
          />
          <button className={styles.widgetBtn}>Добавить к записи</button>
          <div className={styles.moodWriteDivider} />
          <span className={styles.moodWriteLabel}>Написать</span>
          <textarea
            className={styles.moodNoteInput}
            placeholder="Запиши мысль..."
            value={quickNote}
            onChange={e => setQuickNote(e.target.value)}
            rows={3}
          />
          {quickNote.trim() && (
            <button
              className={styles.widgetBtn}
              onClick={() => {
                onNewWithNote?.(`<p>${quickNote.replace(/\n/g, '</p><p>')}</p>`)
                setQuickNote('')
                onClose()
              }}
            >
              Открыть в редакторе
            </button>
          )}
        </div>
      )}

      {id === 'streak' && (
        <div className={styles.widgetBody}>
          <div className={styles.streakBig}>
            <Flame size={32} style={{ color: '#f59e0b' }} />
            <span className={styles.streakNum}>0</span>
          </div>
          <p className={styles.streakSub}>дней подряд</p>
          <p className={styles.streakNote}>Начните вести дневник, чтобы начать серию!</p>
        </div>
      )}
    </motion.div>
  )
}

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
  settings: AppSettings
  onUpdateSettings: (p: Partial<AppSettings>) => void
  onNewWithNote?: (content: string) => void
}

export default function SideNav({ active, onChange, settings, onUpdateSettings, onNewWithNote }: Props) {
  const [openWidget, setOpenWidget] = useState<Widget | null>(null)
  const [showWidgetPicker, setShowWidgetPicker] = useState(false)
  const isResizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(settings.sidebarWidth ?? MIN_WIDTH)
  const [width, setWidth] = useState(settings.sidebarWidth ?? MIN_WIDTH)
  const position = settings.sidebarPosition ?? 'left'
  const showLabels = width > 90

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return
    let newWidth: number
    if (position === 'left') {
      newWidth = e.clientX
    } else {
      newWidth = window.innerWidth - e.clientX
    }
    newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth))
    setWidth(newWidth)
    document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`)
  }, [position])

  const onMouseUp = useCallback(() => {
    if (!isResizing.current) return
    isResizing.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    setWidth(w => {
      onUpdateSettings({ sidebarWidth: w })
      return w
    })
  }, [onMouseMove, onUpdateSettings])

  function onResizeStart(e: React.MouseEvent) {
    e.preventDefault()
    isResizing.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  function toggleWidget(id: Widget) {
    if (id === 'stats') { onChange('stats'); return }
    if (id === 'mood') { onChange('mood'); return }
    if (openWidget === id) { setOpenWidget(null); return }
    setOpenWidget(id)
    setShowWidgetPicker(false)
  }

  function toggleActiveWidget(id: Widget) {
    const cur = settings.activeWidgets
    const next = cur.includes(id) ? cur.filter(w => w !== id) : [...cur, id]
    onUpdateSettings({ activeWidgets: next })
  }

  return (
    <>
      {/* Панель виджета */}
      <AnimatePresence>
        {openWidget && (
          <WidgetPanel
            key={openWidget}
            id={openWidget}
            position={position}
            sidebarWidth={width}
            onClose={() => setOpenWidget(null)}
            onNewWithNote={onNewWithNote}
          />
        )}
      </AnimatePresence>

      {/* Пикер виджетов */}
      <AnimatePresence>
        {showWidgetPicker && (
          <motion.div
            className={styles.widgetPicker}
            style={position === 'left'
              ? { left: `${width + 6}px` }
              : { right: `${width + 6}px` }
            }
            initial={{ opacity: 0, x: position === 'left' ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: position === 'left' ? -12 : 12 }}
            transition={{ duration: 0.15 }}
          >
            <div className={styles.widgetHeader}>
              <span className={styles.widgetTitle}>Виджеты</span>
              <button className={styles.widgetClose} onClick={() => setShowWidgetPicker(false)}>
                <X size={13} />
              </button>
            </div>
            <div className={styles.pickerGrid}>
              {ALL_WIDGETS.map(w => {
                const isOn = settings.activeWidgets.includes(w.id)
                return (
                  <button
                    key={w.id}
                    className={`${styles.pickerCard} ${isOn ? styles.pickerCardOn : ''}`}
                    onClick={() => toggleActiveWidget(w.id)}
                  >
                    <span className={styles.pickerCardIcon}>{w.icon}</span>
                    <span className={styles.pickerCardLabel}>{w.label}</span>
                    {isOn && <span className={styles.pickerCardDot} />}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Сайдбар */}
      <nav
        className={`${styles.sidebar} ${position === 'left' ? styles.sidebarLeft : styles.sidebarRight}`}
        style={{ width }}
      >
        {/* Ручка изменения размера */}
        <div
          className={`${styles.resizeHandle} ${position === 'left' ? styles.resizeRight : styles.resizeLeft}`}
          onMouseDown={onResizeStart}
          title="Изменить ширину"
        />

        {/* Навигация */}
        <div className={styles.navSection}>
          {NAV_ITEMS.map(item => {
            const isNew = item.id === 'new'
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''} ${isNew ? styles.navItemNew : ''} ${showLabels ? styles.navItemWide : ''}`}
                onClick={() => onChange(item.id)}
                title={showLabels ? undefined : item.label}
              >
                {item.icon}
                {showLabels && <span className={styles.navLabel}>{item.label}</span>}
                {isActive && <motion.span className={styles.activeBar} layoutId="active-bar" />}
              </button>
            )
          })}
        </div>

        <div className={styles.divider} />

        {/* Виджеты */}
        <div className={styles.widgetSection}>
          {ALL_WIDGETS.filter(w => settings.activeWidgets.includes(w.id)).map(w => (
            <button
              key={w.id}
              className={`${styles.widgetBtn2} ${openWidget === w.id || (w.id === 'stats' && active === 'stats') ? styles.widgetBtn2Active : ''} ${showLabels ? styles.navItemWide : ''}`}
              onClick={() => toggleWidget(w.id)}
              title={showLabels ? undefined : w.label}
            >
              {w.icon}
              {showLabels && <span className={styles.navLabel}>{w.label}</span>}
            </button>
          ))}
          <button
            className={`${styles.addWidgetBtn} ${showWidgetPicker ? styles.addWidgetBtnActive : ''}`}
            onClick={() => { setShowWidgetPicker(v => !v); setOpenWidget(null) }}
            title="Добавить виджет"
          >
            <Plus size={16} />
          </button>
        </div>
      </nav>
    </>
  )
}
