import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, FolderOpen, FolderEdit, Upload, Download, Type, FileType, Lock, LockOpen } from 'lucide-react'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import { readFile } from '@tauri-apps/plugin-fs'
import LockScreen from '../components/LockScreen'
import type { AppSettings, Theme, FontSize, EditorFont, EditorTexture } from '../types'
import styles from './SettingsPage.module.css'

interface Props {
  settings: AppSettings
  onUpdate: (patch: Partial<AppSettings>) => void
  onResetData?: () => void
  hasPIN: boolean
  onSetPIN: (pin: string) => void
  onClearPIN: () => void
}

/* ── Блок настроек ── */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.group}>
      <h3 className={styles.groupTitle}>{title}</h3>
      <div className={styles.groupBody}>{children}</div>
    </div>
  )
}

/* ── Строка-переключатель ── */
function Toggle({ label, sub, value, onChange }: {
  label: string; sub?: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <span className={styles.rowLabel}>{label}</span>
        {sub && <span className={styles.rowSub}>{sub}</span>}
      </div>
      <button
        className={`${styles.toggle} ${value ? styles.toggleOn : ''}`}
        onClick={() => onChange(!value)}
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  )
}

/* ── Строка с выбором варианта ── */
function OptionRow<T extends string>({ label, sub, value, options, onChange }: {
  label: string; sub?: string; value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <span className={styles.rowLabel}>{label}</span>
        {sub && <span className={styles.rowSub}>{sub}</span>}
      </div>
      <div className={styles.segmented}>
        {options.map(o => (
          <button
            key={o.value}
            className={`${styles.segBtn} ${value === o.value ? styles.segBtnActive : ''}`}
            onClick={() => onChange(o.value)}
          >
            {value === o.value && <Check size={10} />}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Строка со слайдером ── */
function SliderRow({ label, sub, value, min, max, step, unit, onChange }: {
  label: string; sub?: string; value: number
  min: number; max: number; step: number; unit: string
  onChange: (v: number) => void
}) {
  return (
    <div className={styles.rowVertical}>
      <div className={styles.rowTopLine}>
        <div className={styles.rowText}>
          <span className={styles.rowLabel}>{label}</span>
          {sub && <span className={styles.rowSub}>{sub}</span>}
        </div>
        <span className={styles.sliderVal}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        className={styles.slider}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  )
}

const THEMES: { id: Theme; label: string; color: string }[] = [
  { id: 'dark',  label: 'Obsidian',  color: '#7c6ee0' },
  { id: 'light', label: 'Светлая',   color: '#6d5de0' },
  { id: 'bw',    label: 'Монохром',  color: '#e0e0e0' },
  { id: 'warm',  label: 'Сепия',     color: '#c89b6e' },
  { id: 'green', label: 'Терминал',  color: '#4ade80' },
]

const FONT_OPTIONS: { value: EditorFont; label: string }[] = [
  { value: 'sans',        label: 'Системный' },
  { value: 'mono',        label: 'Mono' },
  { value: 'serif',       label: 'Serif' },
  { value: 'merriweather', label: 'Merriweather' },
  { value: 'playfair',    label: 'Playfair' },
  { value: 'roboto',      label: 'Roboto' },
]

function getFontFamily(font: EditorFont, customFont: string): string {
  if (customFont.trim()) return customFont.trim()
  switch (font) {
    case 'sans':         return 'Inter, system-ui, sans-serif'
    case 'mono':         return "'Fira Code', 'Cascadia Code', monospace"
    case 'serif':        return "Georgia, 'Times New Roman', serif"
    case 'merriweather': return "Merriweather, Georgia, serif"
    case 'playfair':     return "'Playfair Display', Georgia, serif"
    case 'roboto':       return "Roboto, 'Helvetica Neue', sans-serif"
    default:             return 'Inter, system-ui, sans-serif'
  }
}

export default function SettingsPage({ settings, onUpdate, onResetData, hasPIN, onSetPIN, onClearPIN }: Props) {
  const [showPinSetup, setShowPinSetup] = useState(false)
  async function handleOpenFolder() {
    try {
      await revealItemInDir(settings.dataDir)
    } catch {
      // folder may not exist yet
    }
  }

  async function handleChangeDir() {
    const selected = await openDialog({ directory: true, title: 'Выбрать папку для данных' })
    if (selected) onUpdate({ dataDir: selected as string })
  }

  async function handleExport() {
    const dest = await openDialog({ directory: true, title: 'Экспорт — выбрать папку назначения' })
    if (dest) {
      // TODO: copy data files to dest
      alert(`Экспорт в: ${dest}`)
    }
  }

  async function handleImport() {
    const src = await openDialog({ directory: true, title: 'Импорт — выбрать папку с данными' })
    if (src) {
      onUpdate({ dataDir: src as string })
    }
  }

  const customFont = settings.customFontName ?? ''

  async function handleFontFileImport() {
    const selected = await openDialog({
      title: 'Выбрать файл шрифта',
      filters: [{ name: 'Шрифты', extensions: ['ttf', 'otf', 'woff', 'woff2'] }],
    })
    if (!selected) return
    const path = selected as string
    const bytes = await readFile(path)
    const base64 = btoa(Array.from(bytes).map(b => String.fromCharCode(b)).join(''))
    const ext = path.split('.').pop()?.toLowerCase() ?? 'ttf'
    const mimeMap: Record<string, string> = {
      ttf: 'font/truetype', otf: 'font/opentype',
      woff: 'font/woff', woff2: 'font/woff2',
    }
    const mime = mimeMap[ext] ?? 'font/truetype'
    const dataUri = `data:${mime};base64,${base64}`
    const fontName = path.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') ?? 'МойШрифт'
    onUpdate({ customFontName: fontName, customFontData: dataUri })
  }

  return (
    <div className={styles.page}>
      {showPinSetup && (
        <LockScreen
          mode="setup"
          onSetup={pin => { onSetPIN(pin); setShowPinSetup(false) }}
          onCancel={() => setShowPinSetup(false)}
        />
      )}
      <motion.div
        className={styles.content}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' as const }}
      >
        <h1 className={styles.pageTitle}>Настройки</h1>

        {/* Акцентный цвет */}
        <Group title="Оформление">
          <div className={styles.rowVertical}>
            <div className={styles.rowTopLine}>
              <div className={styles.rowText}>
                <span className={styles.rowLabel}>Акцентный цвет</span>
                <span className={styles.rowSub}>Переопределяет цвет темы</span>
              </div>
              <div className={styles.accentRow}>
                <input
                  type="color"
                  className={styles.colorPicker}
                  value={settings.accentColor || '#7c6ee0'}
                  onChange={e => onUpdate({ accentColor: e.target.value })}
                />
                {settings.accentColor && (
                  <button className={styles.accentReset} onClick={() => onUpdate({ accentColor: '' })}>
                    Сбросить
                  </button>
                )}
              </div>
            </div>
          </div>
          <OptionRow<EditorTexture>
            label="Текстура редактора"
            value={settings.editorTexture ?? 'none'}
            options={[
              { value: 'none', label: 'Нет' },
              { value: 'lines', label: 'Линии' },
              { value: 'grid', label: 'Клетка' },
              { value: 'dots', label: 'Точки' },
            ]}
            onChange={v => onUpdate({ editorTexture: v })}
          />
        </Group>

        {/* Темы */}
        <Group title="Тема">
          <div className={styles.themes}>
            {THEMES.map(t => (
              <motion.button
                key={t.id}
                className={`${styles.themeCard} ${settings.theme === t.id ? styles.themeCardActive : ''}`}
                onClick={() => onUpdate({ theme: t.id })}
                whileTap={{ scale: 0.93 }}
              >
                <span className={styles.themeColor} style={{ background: t.color }} />
                <span className={styles.themeLabel}>{t.label}</span>
                {settings.theme === t.id && (
                  <motion.span className={styles.themeCheck} initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check size={9} />
                  </motion.span>
                )}
              </motion.button>
            ))}
          </div>
        </Group>

        {/* Текст */}
        <Group title="Текст">
          <OptionRow<FontSize>
            label="Размер шрифта"
            value={settings.fontSize}
            options={[
              { value: 'sm', label: 'S' },
              { value: 'md', label: 'M' },
              { value: 'lg', label: 'L' },
            ]}
            onChange={v => onUpdate({ fontSize: v })}
          />
          <div className={styles.rowVertical}>
            <div className={styles.rowTopLine}>
              <div className={styles.rowText}>
                <span className={styles.rowLabel}>Шрифт редактора</span>
              </div>
              <Type size={13} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className={styles.fontGrid}>
              {FONT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  className={`${styles.fontBtn} ${settings.editorFont === o.value && !customFont ? styles.fontBtnActive : ''}`}
                  onClick={() => { onUpdate({ editorFont: o.value }); onUpdate({ customFontName: '' }) }}
                  style={{ fontFamily: getFontFamily(o.value, '') }}
                >
                  {settings.editorFont === o.value && !customFont && <Check size={9} />}
                  {o.label}
                </button>
              ))}
            </div>
            <div className={styles.fontCustomRow}>
              <Type size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                className={styles.fontCustomInput}
                placeholder="Название шрифта..."
                value={customFont}
                onChange={e => onUpdate({ customFontName: e.target.value, customFontData: '' })}
              />
              <button
                className={styles.fontImportBtn}
                onClick={handleFontFileImport}
                title="Импортировать шрифт из файла (.ttf, .otf, .woff)"
              >
                <FileType size={13} />
                {settings.customFontData ? '✓' : 'Файл'}
              </button>
            </div>
            <div
              className={styles.fontPreview}
              style={{ fontFamily: getFontFamily(settings.editorFont, customFont) }}
            >
              Утром Катя купила свежих булочек — мягких, румяных, с хрустящей корочкой. Аромат ванили и корицы разлетелся по кухне. Она сделала кофе, открыла дневник и начала писать.
            </div>
          </div>
        </Group>

        {/* Редактор */}
        <Group title="Редактор">
          <Toggle
            label="Проверка орфографии"
            value={settings.spellCheck}
            onChange={v => onUpdate({ spellCheck: v })}
          />
          <Toggle
            label="Счётчик слов"
            sub="Отображается в шапке редактора"
            value={settings.showWordCount}
            onChange={v => onUpdate({ showWordCount: v })}
          />
          <div className={styles.row}>
            <div className={styles.rowText}>
              <span className={styles.rowLabel}>Автосохранение</span>
              <span className={styles.rowSub}>Мгновенное — через 1.5с после изменений</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--success)' }}>✓ Включено</span>
          </div>
        </Group>

        {/* Интерфейс */}
        <Group title="Интерфейс">
          <Toggle
            label="Компактный режим"
            sub="Уменьшает отступы и элементы"
            value={settings.compactMode}
            onChange={v => onUpdate({ compactMode: v })}
          />
          <Toggle
            label="Настроение на главной"
            sub="Показывать виджет настроения"
            value={settings.showMoodOnHome}
            onChange={v => onUpdate({ showMoodOnHome: v })}
          />
          <OptionRow<'left' | 'right'>
            label="Позиция боковой панели"
            sub="По умолчанию — слева"
            value={settings.sidebarPosition ?? 'left'}
            options={[
              { value: 'left',  label: 'Слева' },
              { value: 'right', label: 'Справа' },
            ]}
            onChange={v => onUpdate({ sidebarPosition: v })}
          />
        </Group>

        {/* Напоминания */}
        <Group title="Напоминания">
          <Toggle
            label="Ежедневное напоминание"
            sub="Уведомление если нет записи сегодня"
            value={settings.reminderEnabled ?? false}
            onChange={v => onUpdate({ reminderEnabled: v })}
          />
          {settings.reminderEnabled && (
            <div className={styles.row}>
              <span className={styles.rowLabel}>Время</span>
              <input
                type="time"
                className={styles.timeInput}
                value={settings.reminderTime ?? '21:00'}
                onChange={e => onUpdate({ reminderTime: e.target.value })}
              />
            </div>
          )}
        </Group>

        {/* Безопасность */}
        <Group title="Безопасность">
          <div className={styles.row}>
            <div className={styles.rowText}>
              <span className={styles.rowLabel}>PIN-код</span>
              <span className={styles.rowSub}>{hasPIN ? 'Защита установлена' : 'Приложение не защищено'}</span>
            </div>
            {hasPIN ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className={styles.pinBtn} onClick={() => setShowPinSetup(true)}>
                  <Lock size={12} /> Изменить
                </button>
                <button className={`${styles.pinBtn} ${styles.pinBtnDanger}`} onClick={onClearPIN}>
                  <LockOpen size={12} /> Снять
                </button>
              </div>
            ) : (
              <button className={styles.pinBtn} onClick={() => setShowPinSetup(true)}>
                <Lock size={12} /> Установить
              </button>
            )}
          </div>
        </Group>

        {/* Хранилище */}
        <Group title="Хранилище">
          <div className={styles.aboutRow}>
            <span className={styles.aboutLabel}>Директория</span>
            <span className={styles.aboutVal}>{settings.dataDir}</span>
          </div>
          <div className={styles.storageActions}>
            <button className={styles.storageBtn} onClick={handleOpenFolder} title="Открыть папку">
              <FolderOpen size={14} />
              Открыть папку
            </button>
            <button className={styles.storageBtn} onClick={handleChangeDir} title="Изменить директорию">
              <FolderEdit size={14} />
              Изменить
            </button>
            <button className={styles.storageBtn} onClick={handleExport} title="Экспорт данных">
              <Upload size={14} />
              Экспорт
            </button>
            <button className={styles.storageBtn} onClick={handleImport} title="Импорт данных">
              <Download size={14} />
              Импорт
            </button>
          </div>
        </Group>

        {/* О приложении */}
        <Group title="О приложении">
          <div className={styles.aboutRow}>
            <span className={styles.aboutLabel}>Dnevchik</span>
            <span className={styles.aboutVal}>v0.1.0</span>
          </div>
          <div className={styles.aboutRow}>
            <span className={styles.aboutLabel}>Версия</span>
            <span className={styles.aboutVal}>0.1.1</span>
          </div>
          {onResetData && (
            <div className={styles.resetRow}>
              <button
                className={styles.resetBtn}
                onClick={() => {
                  if (window.confirm('Сбросить все данные?\n\nВсе записи и настройки будут удалены. Это действие нельзя отменить.')) {
                    onResetData()
                  }
                }}
              >
                Сбросить данные
              </button>
              <span className={styles.resetSub}>Удалит все записи и вернёт приложение к первоначальному состоянию</span>
            </div>
          )}
        </Group>
      </motion.div>
    </div>
  )
}
