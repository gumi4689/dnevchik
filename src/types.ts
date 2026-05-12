export type Theme = 'dark' | 'light' | 'bw' | 'warm' | 'green'
export type FontSize = 'sm' | 'md' | 'lg'
export type EditorFont = 'sans' | 'mono' | 'serif' | 'merriweather' | 'playfair' | 'roboto'
export type EditorTexture = 'none' | 'lines' | 'grid' | 'dots'

export type Tab = 'home' | 'new' | 'search' | 'settings' | 'stats' | 'mood' | 'graph' | 'timeline' | 'habits'
export type Widget = 'mood' | 'stats' | 'streak'

export interface MediaFile {
  id: string
  name: string
  type: 'image' | 'audio' | 'video'
  dataUrl: string
}

export interface EntryVersion {
  ts: string
  title: string
  content: string
}

export interface Entry {
  id: string
  title: string
  content: string
  mood: number | null
  tags: string[]
  createdAt: string
  updatedAt: string
  isArchived: boolean
  mediaFiles?: MediaFile[]
  bookmarked?: boolean
  weather?: { temp: number; condition: string; emoji: string }
  history?: EntryVersion[]
}

export interface AppSettings {
  theme: Theme
  fontSize: FontSize
  editorFont: EditorFont
  spellCheck: boolean
  compactMode: boolean
  showWordCount: boolean
  showMoodOnHome: boolean
  activeWidgets: Widget[]
  dataDir: string
  sidebarPosition: 'left' | 'right'
  sidebarWidth: number
  customFontName: string
  customFontData: string
  accentColor: string
  editorTexture: EditorTexture
  reminderEnabled: boolean
  reminderTime: string
}

export interface Habit {
  id: string
  name: string
  emoji: string
  color: string
}

export interface HabitLog {
  date: string
  habitId: string
}

export interface UserProfile {
  name: string
  age: string
  bio: string
}

export interface OpenTab {
  id: string
  entryId?: string
  title: string
  groupId?: string
  isDirty?: boolean
  initialContent?: string
}

export interface TabGroup {
  id: string
  name: string
  color: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  fontSize: 'md',
  editorFont: 'sans',
  spellCheck: false,
  compactMode: false,
  showWordCount: true,
  showMoodOnHome: true,
  activeWidgets: ['mood', 'streak'],
  dataDir: '%APPDATA%\\Dnevchik',
  sidebarPosition: 'left',
  sidebarWidth: 52,
  customFontName: '',
  customFontData: '',
  accentColor: '',
  editorTexture: 'none',
  reminderEnabled: false,
  reminderTime: '21:00',
}
