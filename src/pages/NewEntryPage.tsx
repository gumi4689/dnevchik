import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Check, Hash, Smile, Cloud, Music, Video, X, Star, Maximize2, Minimize2, History, Link, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import RichEditor from '../components/RichEditor'
import MoodShape from '../components/MoodShape'
import { useWeather } from '../hooks/useWeather'
import { analyzeTone } from '../data/sentimentWords'
import { TEMPLATES } from '../data/templates'
import type { Tab, AppSettings, Entry, MediaFile, EntryVersion } from '../types'
import styles from './NewEntryPage.module.css'

const MOOD_LABELS: Record<number, string> = {
  0: 'Ужасно', 1: 'Очень плохо', 2: 'Плохо', 3: 'Не очень',
  4: 'Так себе', 5: 'Нормально', 6: 'Хорошо',
  7: 'Довольно хорошо', 8: 'Отлично', 9: 'Замечательно', 10: 'Великолепно',
}

function moodHeaderColor(mood: number): string {
  if (mood >= 8) return 'rgba(74,222,128,0.06)'
  if (mood >= 6) return 'rgba(124,110,224,0.06)'
  if (mood >= 4) return 'rgba(251,191,36,0.05)'
  return 'rgba(248,113,113,0.06)'
}

function extractWikiLinks(content: string): string[] {
  const matches = content.match(/\[\[([^\]]+)\]\]/g) ?? []
  return matches.map(m => m.slice(2, -2).trim())
}

interface Props {
  onTabChange: (tab: Tab) => void
  settings: AppSettings
  initialEntry?: Entry | null
  initialContent?: string
  allEntries?: Entry[]
  onSave?: (entry: Entry) => void
  onOpenEntry?: (entry: Entry) => void
}

export default function NewEntryPage({ onTabChange, settings, initialEntry, initialContent, allEntries = [], onSave, onOpenEntry }: Props) {
  const [title, setTitle] = useState(initialEntry?.title ?? '')
  const [content, setContent] = useState(initialEntry?.content ?? initialContent ?? '')
  const [mood, setMood] = useState(initialEntry?.mood ?? 5)
  const [tags, setTags] = useState<string[]>(initialEntry?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showMood, setShowMood] = useState(false)
  const [showTags, setShowTags] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(initialEntry?.mediaFiles ?? [])
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [bookmarked, setBookmarked] = useState(initialEntry?.bookmarked ?? false)
  const [focusMode, setFocusMode] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showTemplates, setShowTemplates] = useState(!initialEntry && !initialContent)
  const [history, setHistory] = useState<EntryVersion[]>(initialEntry?.history ?? [])
  const [scrollProgress, setScrollProgress] = useState(0)
  const titleRef = useRef<HTMLInputElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastVersionTs = useRef(initialEntry?.updatedAt ?? '')
  const entryId = useRef(initialEntry?.id ?? crypto.randomUUID())
  const createdAt = useRef(initialEntry?.createdAt ?? new Date().toISOString())
  const editorScrollRef = useRef<HTMLDivElement>(null)
  const { weather } = useWeather()

  useEffect(() => {
    if (!initialEntry && !showTemplates) titleRef.current?.focus()
  }, [initialEntry, showTemplates])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'F11' || (e.key === 'f' && e.altKey)) {
        e.preventDefault()
        setFocusMode(v => !v)
      }
      if (e.key === 'Escape' && focusMode) setFocusMode(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [focusMode])

  const tone = useMemo(() => analyzeTone(content), [content])

  const linkedEntries = useMemo(() => {
    const links = extractWikiLinks(content)
    if (!links.length) return []
    return allEntries.filter(e =>
      e.id !== entryId.current &&
      links.some(l => e.title.toLowerCase().includes(l.toLowerCase()))
    ).slice(0, 5)
  }, [content, allEntries])

  const backLinks = useMemo(() => {
    if (!title) return []
    return allEntries.filter(e =>
      e.id !== entryId.current &&
      e.content.includes(`[[${title}]]`)
    ).slice(0, 5)
  }, [allEntries, title])

  const buildEntry = useCallback((): Entry => ({
    id: entryId.current,
    title,
    content,
    mood,
    tags,
    createdAt: createdAt.current,
    updatedAt: new Date().toISOString(),
    isArchived: false,
    mediaFiles,
    bookmarked,
    weather: weather ?? undefined,
    history,
  }), [title, content, mood, tags, mediaFiles, bookmarked, weather, history])

  const triggerAutosave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(() => {
      const now = new Date().toISOString()
      const msSinceLast = lastVersionTs.current
        ? new Date(now).getTime() - new Date(lastVersionTs.current).getTime()
        : Infinity
      if (msSinceLast > 5 * 60 * 1000) {
        setHistory(prev => {
          const snap: EntryVersion = { ts: now, title, content }
          return [snap, ...prev].slice(0, 5)
        })
        lastVersionTs.current = now
      }
      const entry = buildEntry()
      onSave?.(entry)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1800)
    }, 1500)
  }, [buildEntry, onSave, title, content])

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value)
    triggerAutosave()
  }

  function handleContentChange(html: string) {
    setContent(html)
    triggerAutosave()
    if (settings.showWordCount) {
      const text = html.replace(/<[^>]*>/g, ' ')
      setWordCount(text.trim().split(/\s+/).filter(Boolean).length)
    }
  }

  function addTag(e: React.KeyboardEvent) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const tag = tagInput.trim().replace(/^#/, '')
      if (!tags.includes(tag)) setTags(prev => [...prev, tag])
      setTagInput('')
    }
    if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags(prev => prev.slice(0, -1))
    }
  }

  function handleMediaAdd(file: MediaFile) {
    setMediaFiles(prev => [...prev, file])
    triggerAutosave()
  }

  function removeMedia(id: string) {
    setMediaFiles(prev => prev.filter(f => f.id !== id))
    triggerAutosave()
  }

  function handleEditorScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    if (el.scrollHeight > el.clientHeight) {
      setScrollProgress(el.scrollTop / (el.scrollHeight - el.clientHeight))
    }
  }

  function restoreVersion(v: EntryVersion) {
    setTitle(v.title)
    setContent(v.content)
    setShowHistory(false)
  }

  function selectTemplate(tpl: typeof TEMPLATES[0]) {
    setTitle(tpl.title)
    setContent(tpl.content)
    setShowTemplates(false)
    setTimeout(() => titleRef.current?.focus(), 100)
  }

  const textureBg: Record<string, string> = {
    lines: 'repeating-linear-gradient(transparent, transparent 27px, var(--border) 28px)',
    grid: 'repeating-linear-gradient(var(--border) 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, var(--border) 0 1px, transparent 1px 28px)',
    dots: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
  }
  const textureStyle: React.CSSProperties = {}
  if (settings.editorTexture && settings.editorTexture !== 'none') {
    textureStyle.backgroundImage = textureBg[settings.editorTexture] ?? ''
    if (settings.editorTexture === 'dots') {
      textureStyle.backgroundSize = '28px 28px'
    }
  }

  /* Template picker */
  if (showTemplates) {
    return (
      <div className={styles.templatePicker}>
        <h2 className={styles.templateTitle}>Выбери шаблон</h2>
        <div className={styles.templateGrid}>
          {TEMPLATES.map(tpl => (
            <motion.button
              key={tpl.id}
              className={styles.templateCard}
              onClick={() => selectTemplate(tpl)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className={styles.templateEmoji}>{tpl.emoji}</span>
              <span className={styles.templateName}>{tpl.name}</span>
              <span className={styles.templateDesc}>{tpl.description}</span>
            </motion.button>
          ))}
        </div>
      </div>
    )
  }

  const headerBg = moodHeaderColor(mood)

  return (
    <motion.div
      className={`${styles.page} ${isDraggingOver ? styles.dragOver : ''} ${focusMode ? styles.focusMode : ''}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' as const }}
      onDragOver={e => { if (Array.from(e.dataTransfer.types).includes('Files')) { e.preventDefault(); setIsDraggingOver(true) } }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingOver(false) }}
      onDrop={() => setIsDraggingOver(false)}
    >
      {/* Шапка */}
      <AnimatePresence>
        {!focusMode && (
          <motion.header
            className={styles.header}
            style={{ background: headerBg }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
          >
            <button className={styles.backBtn} onClick={() => onTabChange('home')}>
              <ChevronLeft size={18} />
            </button>

            <div className={styles.headerMeta}>
              <span className={styles.headerDate}>
                {new Date(createdAt.current).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              {weather && <span className={styles.weatherBadge}>{weather.emoji} {weather.temp}°</span>}
              {settings.showWordCount && wordCount > 0 && (
                <span className={styles.wordCount}>{wordCount} сл.</span>
              )}
            </div>

            <div className={styles.headerActions}>
              <AnimatePresence>
                {saveStatus !== 'idle' && (
                  <motion.span
                    className={`${styles.saveStatus} ${saveStatus === 'saved' ? styles.saveStatusDone : ''}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    {saveStatus === 'saving' ? <><Cloud size={12} /> Сохранение...</> : <><Check size={12} /> Сохранено</>}
                  </motion.span>
                )}
              </AnimatePresence>
              <button className={`${styles.actionBtn} ${bookmarked ? styles.actionBtnStar : ''}`} onClick={() => { setBookmarked(v => !v); triggerAutosave() }} title="Избранное">
                <Star size={15} fill={bookmarked ? 'currentColor' : 'none'} />
              </button>
              {history.length > 0 && (
                <button className={`${styles.actionBtn} ${showHistory ? styles.actionBtnActive : ''}`} onClick={() => setShowHistory(v => !v)} title="История версий">
                  <History size={15} />
                </button>
              )}
              <button className={`${styles.actionBtn} ${showTags ? styles.actionBtnActive : ''}`} onClick={() => { setShowTags(v => !v); setShowMood(false) }} title="Теги">
                <Hash size={15} />
              </button>
              <button className={`${styles.actionBtn} ${showMood ? styles.actionBtnActive : ''}`} onClick={() => { setShowMood(v => !v); setShowTags(false) }} title="Настроение">
                <Smile size={15} />
              </button>
              <button className={styles.actionBtn} onClick={() => setFocusMode(true)} title="Режим фокуса (Alt+F)">
                <Maximize2 size={15} />
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Кнопка выхода из фокус-режима */}
      {focusMode && (
        <button className={styles.focusExit} onClick={() => setFocusMode(false)} title="Выйти из фокуса (Esc)">
          <Minimize2 size={14} />
        </button>
      )}

      {/* История версий */}
      <AnimatePresence>
        {showHistory && (
          <motion.div className={styles.historyPanel} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div className={styles.historyTitle}>История версий</div>
            {history.map((v, i) => (
              <button key={v.ts} className={styles.historyItem} onClick={() => restoreVersion(v)}>
                <span className={styles.historyTime}>{new Date(v.ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <span className={styles.historyPreview}>{v.title || v.content.replace(/<[^>]*>/g, ' ').slice(0, 40)}</span>
                {i === 0 && <span className={styles.historyLatest}>последняя</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Теги */}
      <AnimatePresence>
        {showTags && !focusMode && (
          <motion.div className={styles.tagsRow} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
            {tags.map(tag => (
              <span key={tag} className={styles.tag} onClick={() => setTags(prev => prev.filter(t => t !== tag))}>#{tag} ×</span>
            ))}
            <input className={styles.tagInput} placeholder="Тег + Enter..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Настроение */}
      <AnimatePresence>
        {showMood && !focusMode && (
          <motion.div className={styles.moodPanel} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
            <MoodShape mood={mood} size={32} />
            <span className={styles.moodLabel}>{mood}/10 — {MOOD_LABELS[mood]}</span>
            <input type="range" min={0} max={10} value={mood} className={styles.moodSlider} onChange={e => { setMood(Number(e.target.value)); triggerAutosave() }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Заголовок */}
      <div className={styles.titleWrap}>
        <input ref={titleRef} className={styles.titleInput} placeholder="Без названия" value={title} onChange={handleTitleChange} />
      </div>

      {/* Редактор + прогресс */}
      <div className={styles.editorWrapper}>
        <div className={styles.editorArea} style={textureStyle} ref={editorScrollRef} onScroll={handleEditorScroll}>
          <RichEditor
            content={content}
            onChange={handleContentChange}
            editorFont={settings.editorFont}
            spellCheck={settings.spellCheck}
            placeholder="Начни писать... Используй [[название]] для ссылок на другие записи"
            onMediaAdd={handleMediaAdd}
          />
        </div>
        <div className={styles.scrollTrack}>
          <div className={styles.scrollThumb} style={{ top: `${scrollProgress * 100}%` }} />
        </div>
      </div>

      {/* Нижняя панель: тональность */}
      {content.length > 50 && !focusMode && (
        <div className={styles.toneBar}>
          <div className={styles.toneLabel}>Тональность</div>
          <div className={styles.toneMeter}>
            <div className={styles.toneFill} style={{
              width: `${Math.abs(tone.score) * 100}%`,
              background: tone.score > 0.1 ? '#4ade80' : tone.score < -0.1 ? '#f87171' : '#a78bfa',
              marginLeft: tone.score >= 0 ? '50%' : `${(0.5 + tone.score / 2) * 100}%`,
            }} />
            <div className={styles.toneMid} />
          </div>
          <span className={styles.toneScore} style={{ color: tone.score > 0.1 ? '#4ade80' : tone.score < -0.1 ? '#f87171' : 'var(--text-muted)' }}>
            {tone.score > 0.1 ? '😊' : tone.score < -0.1 ? '😔' : '😐'}
            {tone.positive > 0 || tone.negative > 0 ? ` +${tone.positive} −${tone.negative}` : ' нейтрально'}
          </span>
        </div>
      )}

      {/* Связи — Obsidian-style */}
      {(linkedEntries.length > 0 || backLinks.length > 0) && !focusMode && (
        <div className={styles.linksPanel}>
          {linkedEntries.length > 0 && (
            <div className={styles.linksGroup}>
              <span className={styles.linksGroupLabel}>
                <ArrowUpRight size={11} /> Исходящие ({linkedEntries.length})
              </span>
              <div className={styles.linksCards}>
                {linkedEntries.map(e => (
                  <button key={e.id} className={styles.linkCard} onClick={() => onOpenEntry?.(e)}>
                    <span className={styles.linkCardIcon}><Link size={10} /></span>
                    <span className={styles.linkCardTitle}>{e.title || '(без названия)'}</span>
                    <span className={styles.linkCardPreview}>{e.content.replace(/<[^>]*>/g, ' ').trim().slice(0, 55)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {backLinks.length > 0 && (
            <div className={styles.linksGroup}>
              <span className={styles.linksGroupLabel}>
                <ArrowDownLeft size={11} /> Обратные ссылки ({backLinks.length})
              </span>
              <div className={styles.linksCards}>
                {backLinks.map(e => (
                  <button key={e.id} className={styles.linkCard} onClick={() => onOpenEntry?.(e)}>
                    <span className={styles.linkCardIcon}><Link size={10} /></span>
                    <span className={styles.linkCardTitle}>{e.title || '(без названия)'}</span>
                    <span className={styles.linkCardPreview}>{e.content.replace(/<[^>]*>/g, ' ').trim().slice(0, 55)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Медиафайлы */}
      {mediaFiles.length > 0 && !focusMode && (
        <div className={styles.mediaArea}>
          {mediaFiles.map(file => (
            <div key={file.id} className={styles.mediaItem}>
              <div className={styles.mediaItemHeader}>
                {file.type === 'audio' ? <Music size={13} /> : <Video size={13} />}
                <span className={styles.mediaItemName}>{file.name}</span>
                <button className={styles.mediaRemove} onClick={() => removeMedia(file.id)} title="Удалить"><X size={12} /></button>
              </div>
              {file.type === 'audio' && <audio controls src={file.dataUrl} className={styles.mediaPlayer} />}
              {file.type === 'video' && <video controls src={file.dataUrl} className={styles.mediaPlayer} />}
            </div>
          ))}
        </div>
      )}

      {isDraggingOver && <div className={styles.dropOverlay}><p>Отпустите файл для добавления</p></div>}
    </motion.div>
  )
}
