import { useState, useEffect } from 'react'
import type { AppSettings } from '../types'
import { DEFAULT_SETTINGS } from '../types'

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem('settings')
    const base = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
    // Font data stored separately (can be large)
    const customFontData = localStorage.getItem('dnevchik_custom_font') ?? ''
    return { ...base, customFontData }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function applySettings(s: AppSettings) {
  const root = document.documentElement
  const themeMap: Record<string, string> = {
    dark: '', light: 'light', bw: 'bw', warm: 'warm', green: 'green',
  }
  const attr = themeMap[s.theme]
  if (attr) root.setAttribute('data-theme', attr)
  else root.removeAttribute('data-theme')

  root.setAttribute('data-font-size', s.fontSize)
  root.setAttribute('data-editor-font', s.editorFont)
  root.style.setProperty('--sidebar-width', `${s.sidebarWidth ?? 52}px`)

  if (s.accentColor) {
    root.style.setProperty('--accent', s.accentColor)
    const r = parseInt(s.accentColor.slice(1, 3), 16)
    const g = parseInt(s.accentColor.slice(3, 5), 16)
    const b = parseInt(s.accentColor.slice(5, 7), 16)
    root.style.setProperty('--accent-soft', `rgba(${r},${g},${b},0.15)`)
    root.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.35)`)
  } else {
    root.style.removeProperty('--accent')
    root.style.removeProperty('--accent-soft')
    root.style.removeProperty('--accent-glow')
  }

  // Inject custom @font-face if font data exists
  const existing = document.getElementById('dnevchik-custom-font-face')
  if (s.customFontData && s.customFontName) {
    if (!existing || existing.getAttribute('data-font') !== s.customFontName) {
      existing?.remove()
      const style = document.createElement('style')
      style.id = 'dnevchik-custom-font-face'
      style.setAttribute('data-font', s.customFontName)
      style.textContent = `@font-face { font-family: "${s.customFontName}"; src: url("${s.customFontData}"); }`
      document.head.appendChild(style)
    }
  } else {
    existing?.remove()
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)

  useEffect(() => {
    applySettings(settings)
    // Save without large font data blob
    const { customFontData, ...toSave } = settings
    localStorage.setItem('settings', JSON.stringify({ ...toSave, customFontData: '' }))
    if (customFontData) {
      localStorage.setItem('dnevchik_custom_font', customFontData)
    } else {
      localStorage.removeItem('dnevchik_custom_font')
    }
  }, [settings])

  function update(patch: Partial<AppSettings>) {
    setSettings(prev => ({ ...prev, ...patch }))
  }

  return { settings, update }
}
