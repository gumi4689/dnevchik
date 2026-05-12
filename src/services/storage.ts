import {
  readTextFile, writeTextFile,
  readDir, mkdir, exists, remove,
} from '@tauri-apps/plugin-fs'
import { appDataDir, join } from '@tauri-apps/api/path'
import type { Entry } from '../types'

// ── Path resolution ───────────────────────────────────────────────────

async function resolveDataDir(dataDir: string): Promise<string> {
  if (dataDir.includes('%APPDATA%') || dataDir.includes('%appdata%')) {
    const base = await appDataDir()
    return await join(base, 'Dnevchik')
  }
  return dataDir
}

// ── File-based entry storage ──────────────────────────────────────────

export async function saveEntryToFile(entry: Entry, dataDir: string): Promise<void> {
  const dir = await resolveDataDir(dataDir)
  await mkdir(dir, { recursive: true })
  const path = await join(dir, `${entry.id}.md`)
  await writeTextFile(path, entryToMarkdown(entry))
}

export async function deleteEntryFile(entryId: string, dataDir: string): Promise<void> {
  try {
    const dir = await resolveDataDir(dataDir)
    const path = await join(dir, `${entryId}.md`)
    await remove(path)
  } catch {
    // file may not exist
  }
}

export async function loadEntriesFromFiles(dataDir: string): Promise<Entry[]> {
  try {
    const dir = await resolveDataDir(dataDir)
    const dirExists = await exists(dir)
    if (!dirExists) {
      // Try migrating from localStorage on first run
      return migrateFromLocalStorage(dataDir)
    }

    const files = await readDir(dir)
    const entries: Entry[] = []

    for (const file of files) {
      if (!file.name?.endsWith('.md')) continue
      const path = await join(dir, file.name)
      const content = await readTextFile(path)
      const entry = markdownToEntry(content)
      if (entry) entries.push(entry)
    }

    // Migrate from localStorage if no md files but localStorage has data
    if (entries.length === 0) {
      const migrated = await migrateFromLocalStorage(dataDir)
      if (migrated.length > 0) return migrated
    }

    return entries.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  } catch (e) {
    console.error('loadEntriesFromFiles error:', e)
    return loadEntriesFromStorage()
  }
}

async function migrateFromLocalStorage(dataDir: string): Promise<Entry[]> {
  const lsEntries = loadEntriesFromStorage()
  if (lsEntries.length === 0) return []
  for (const entry of lsEntries) {
    await saveEntryToFile(entry, dataDir)
  }
  localStorage.removeItem('dnevchik_entries')
  return lsEntries
}

// ── localStorage fallback (settings & migration) ──────────────────────

export function saveEntriesToStorage(entries: Entry[]): void {
  localStorage.setItem('dnevchik_entries', JSON.stringify(entries))
}

export function loadEntriesFromStorage(): Entry[] {
  try {
    const raw = localStorage.getItem('dnevchik_entries')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// ── Markdown serialization ────────────────────────────────────────────

export function entryToMarkdown(entry: Entry): string {
  const frontmatter = [
    '---',
    `id: "${entry.id}"`,
    `title: "${entry.title.replace(/"/g, '\\"')}"`,
    `mood: ${entry.mood ?? 'null'}`,
    `tags: [${entry.tags.map(t => `"${t}"`).join(', ')}]`,
    `createdAt: "${entry.createdAt}"`,
    `updatedAt: "${entry.updatedAt}"`,
    '---',
    '',
  ].join('\n')

  const text = entry.content
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '_$1_')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()

  return frontmatter + text
}

export function markdownToEntry(md: string): Entry | null {
  try {
    const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    if (!fmMatch) return null

    const fm = fmMatch[1]
    const content = fmMatch[2].trim()

    const id = fm.match(/id: "([^"]+)"/)?.[1] ?? crypto.randomUUID()
    const title = fm.match(/title: "([^"]+)"/)?.[1] ?? ''
    const moodStr = fm.match(/mood: (.+)/)?.[1]
    const mood = moodStr && moodStr.trim() !== 'null' ? Number(moodStr.trim()) : null
    const tagsStr = fm.match(/tags: \[([^\]]*)\]/)?.[1] ?? ''
    const tags = tagsStr
      ? tagsStr.split(',').map(t => t.trim().replace(/^"|"$/g, '')).filter(Boolean)
      : []
    const createdAt = fm.match(/createdAt: "([^"]+)"/)?.[1] ?? new Date().toISOString()
    const updatedAt = fm.match(/updatedAt: "([^"]+)"/)?.[1] ?? createdAt

    const html = content
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .split('\n\n')
      .map(p => p.trim() ? (p.startsWith('<h') ? p : `<p>${p}</p>`) : '')
      .join('\n')

    return { id, title, content: html, mood, tags, createdAt, updatedAt, isArchived: false }
  } catch {
    return null
  }
}

export function generateFilename(entry: Entry): string {
  const date = entry.createdAt.slice(0, 10)
  const slug =
    entry.title.toLowerCase().replace(/[^a-zа-я0-9]/gi, '-').slice(0, 30) || 'запись'
  return `${date}_${slug}.md`
}
