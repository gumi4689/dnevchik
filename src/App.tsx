import { useState, useEffect } from 'react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import SideNav from './components/SideNav'
import TabBar from './components/TabBar'
import Onboarding from './components/Onboarding'
import HomePage from './pages/HomePage'
import NewEntryPage from './pages/NewEntryPage'
import SettingsPage from './pages/SettingsPage'
import SearchPage from './pages/SearchPage'
import StatsPage from './pages/StatsPage'
import MoodPage from './pages/MoodPage'
import GraphPage from './pages/GraphPage'
import TimelinePage from './pages/TimelinePage'
import HabitsPage from './pages/HabitsPage'
import LockScreen from './components/LockScreen'
import AppCover from './components/AppCover'
import { useSettings } from './hooks/useSettings'
import { useReminder } from './hooks/useReminder'
import { loadEntriesFromFiles, saveEntryToFile } from './services/storage'
import { appDataDir, join } from '@tauri-apps/api/path'
import { openUrl } from '@tauri-apps/plugin-opener'
import type { Tab, Entry, UserProfile, OpenTab, TabGroup } from './types'
import styles from './App.module.css'

const pageVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.16, ease: 'easeOut' as const } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.1, ease: 'easeIn' as const } },
}

const GROUP_COLORS = ['#7c6ee0', '#4ade80', '#f59e0b', '#ef4444', '#38bdf8', '#fb7185']

export default function App() {
  const [onboardingDone, setOnboardingDone] = useState(
    () => !!localStorage.getItem('onboarding_done')
  )
  const [isLocked, setIsLocked] = useState(() => !!localStorage.getItem('dnevchik_pin'))
  const [hasPIN, setHasPIN] = useState(() => !!localStorage.getItem('dnevchik_pin'))
  const [showCover, setShowCover] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [entries, setEntries] = useState<Entry[]>([])
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [tabGroups, setTabGroups] = useState<TabGroup[]>([])
  const { settings, update } = useSettings()
  useReminder(settings.reminderEnabled, settings.reminderTime, entries)

  useEffect(() => {
    if (!onboardingDone) return
    // Resolve %APPDATA% placeholder to real path once
    const raw = settings.dataDir
    if (raw === '%APPDATA%\\Dnevchik' || raw === '%APPDATA%/Dnevchik') {
      appDataDir()
        .then(base => join(base, 'Dnevchik'))
        .then(resolved => update({ dataDir: resolved }))
        .catch(console.error)
      return
    }
    loadEntriesFromFiles(settings.dataDir)
      .then(loaded => setEntries(loaded))
      .catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.dataDir, onboardingDone])

  function handleOnboardingDone(profile: UserProfile, dataDir: string) {
    localStorage.setItem('onboarding_done', '1')
    if (profile.name) localStorage.setItem('user_name', profile.name)
    update({ dataDir })
    setOnboardingDone(true)
  }

  function handleResetData() {
    localStorage.clear()
    setEntries([])
    setOpenTabs([])
    setActiveTabId(null)
    setTabGroups([])
    setHasPIN(false)
    setIsLocked(false)
    setOnboardingDone(false)
  }

  function handleSetPIN(pin: string) {
    localStorage.setItem('dnevchik_pin', pin)
    setHasPIN(true)
  }

  function handleClearPIN() {
    localStorage.removeItem('dnevchik_pin')
    setHasPIN(false)
  }

  function handleUnlock(pin: string): boolean {
    const stored = localStorage.getItem('dnevchik_pin')
    if (pin === stored) { setIsLocked(false); return true }
    return false
  }

  function handleNewWithPrompt(prompt: string) {
    const tab: import('./types').OpenTab = {
      id: crypto.randomUUID(),
      title: 'Без названия',
      isDirty: false,
      initialContent: `<p><em>${prompt}</em></p><p><br></p>`,
    }
    setOpenTabs(prev => [...prev, tab])
    setActiveTabId(tab.id)
    setActiveTab('new')
  }

  function saveEntry(entry: Entry) {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === entry.id)
      return idx >= 0
        ? prev.map((e, i) => i === idx ? entry : e)
        : [entry, ...prev]
    })
    saveEntryToFile(entry, settings.dataDir).catch(console.error)
    setOpenTabs(prev => prev.map(t => t.entryId === entry.id ? { ...t, title: entry.title || 'Без названия', isDirty: false } : t))
  }

  function openEntry(entry: Entry) {
    const existing = openTabs.find(t => t.entryId === entry.id)
    if (existing) {
      setActiveTabId(existing.id)
    } else {
      const tab: OpenTab = {
        id: crypto.randomUUID(),
        entryId: entry.id,
        title: entry.title || 'Без названия',
      }
      setOpenTabs(prev => [...prev, tab])
      setActiveTabId(tab.id)
    }
    setActiveTab('new')
  }

  function handleTabChange(tab: Tab) {
    if (tab !== 'new') setActiveTabId(null)
    setActiveTab(tab)
  }

  function handleNewTab() {
    const tab: OpenTab = {
      id: crypto.randomUUID(),
      title: 'Без названия',
      isDirty: false,
    }
    setOpenTabs(prev => [...prev, tab])
    setActiveTabId(tab.id)
    setActiveTab('new')
  }

  function handleTabClick(tabId: string) {
    setActiveTabId(tabId)
    setActiveTab('new')
  }

  function handleTabClose(tabId: string) {
    setOpenTabs(prev => {
      const next = prev.filter(t => t.id !== tabId)
      if (activeTabId === tabId) {
        const idx = prev.findIndex(t => t.id === tabId)
        const newActive = next[idx] ?? next[idx - 1] ?? null
        setActiveTabId(newActive?.id ?? null)
        if (!newActive) setActiveTab('home')
      }
      return next
    })
  }

  function handleCreateGroup(tabId1: string, tabId2: string) {
    const colorIdx = tabGroups.length % GROUP_COLORS.length
    const group: TabGroup = {
      id: crypto.randomUUID(),
      name: 'Группа',
      color: GROUP_COLORS[colorIdx],
    }
    setTabGroups(prev => [...prev, group])
    setOpenTabs(prev => prev.map(t =>
      t.id === tabId1 || t.id === tabId2 ? { ...t, groupId: group.id } : t
    ))
  }

  function handleAddToGroup(tabId: string, groupId: string) {
    setOpenTabs(prev => prev.map(t =>
      t.id === tabId ? { ...t, groupId } : t
    ))
  }

  function handleRenameGroup(groupId: string, name: string) {
    setTabGroups(prev => prev.map(g => g.id === groupId ? { ...g, name } : g))
  }

  function handleUngroupGroup(groupId: string) {
    setOpenTabs(prev => prev.map(t =>
      t.groupId === groupId ? { ...t, groupId: undefined } : t
    ))
    setTabGroups(prev => prev.filter(g => g.id !== groupId))
  }

  function handleDeleteGroup(groupId: string) {
    const tabIds = openTabs.filter(t => t.groupId === groupId).map(t => t.id)
    setOpenTabs(prev => prev.filter(t => t.groupId !== groupId))
    setTabGroups(prev => prev.filter(g => g.id !== groupId))
    if (activeTabId && tabIds.includes(activeTabId)) {
      setActiveTabId(null)
      setActiveTab('home')
    }
  }

  const activeOpenTab = openTabs.find(t => t.id === activeTabId)
  const activeEntryId = activeOpenTab?.entryId
  const activeEntry = activeEntryId ? entries.find(e => e.id === activeEntryId) ?? null : null

  if (!onboardingDone) {
    return <Onboarding onDone={handleOnboardingDone} />
  }

  if (isLocked) {
    return <LockScreen mode="lock" onUnlock={handleUnlock} />
  }

  if (showCover) {
    return <AppCover onDone={() => setShowCover(false)} />
  }

  const position = settings.sidebarPosition ?? 'left'
  const showTabBar = openTabs.length >= 2

  const sidebar = (
    <SideNav
      active={activeTab}
      onChange={handleTabChange}
      settings={settings}
      onUpdateSettings={update}
      onNewWithNote={handleNewWithPrompt}
    />
  )

  return (
    <div className={styles.app} data-compact={settings.compactMode ? '' : undefined}>
      {position === 'left' && sidebar}

      <div className={styles.pageWrap}>
        {showTabBar && (
          <TabBar
            tabs={openTabs}
            groups={tabGroups}
            activeTabId={activeTabId}
            onTabClick={handleTabClick}
            onTabClose={handleTabClose}
            onTabNew={handleNewTab}
            onCreateGroup={handleCreateGroup}
            onAddToGroup={handleAddToGroup}
            onRenameGroup={handleRenameGroup}
            onUngroupGroup={handleUngroupGroup}
            onDeleteGroup={handleDeleteGroup}
          />
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab === 'new' ? (activeTabId ?? 'new') : activeTab}
            className={styles.pageContent}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {activeTab === 'home' && (
              <HomePage
                entries={entries}
                onTabChange={handleTabChange}
                settings={settings}
                onOpenEntry={openEntry}
                onStatsClick={() => handleTabChange('stats')}
                onNewWithPrompt={handleNewWithPrompt}
              />
            )}
            {activeTab === 'new' && (
              <NewEntryPage
                onTabChange={handleTabChange}
                settings={settings}
                initialEntry={activeEntry}
                initialContent={activeEntry ? undefined : activeOpenTab?.initialContent}
                allEntries={entries}
                onSave={saveEntry}
                onOpenEntry={openEntry}
              />
            )}
            {activeTab === 'search' && (
              <SearchPage entries={entries} onOpenEntry={(entry, _query) => openEntry(entry)} />
            )}
            {activeTab === 'stats' && (
              <StatsPage entries={entries} onOpenEntry={openEntry} />
            )}
            {activeTab === 'mood' && (
              <MoodPage
                onSave={(_mood, _reasons) => handleTabChange('home')}
                onCreateEntry={(_mood, _reasons) => handleNewTab()}
                onClose={() => handleTabChange('home')}
              />
            )}
            {activeTab === 'timeline' && (
              <TimelinePage entries={entries} onOpenEntry={openEntry} />
            )}
            {activeTab === 'habits' && (
              <HabitsPage />
            )}
            {activeTab === 'graph' && (
              <GraphPage entries={entries} onOpenEntry={openEntry} />
            )}
            {activeTab === 'settings' && (
              <SettingsPage
                settings={settings}
                onUpdate={update}
                onResetData={handleResetData}
                hasPIN={hasPIN}
                onSetPIN={handleSetPIN}
                onClearPIN={handleClearPIN}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {position === 'right' && sidebar}

      <button
        className={styles.feedbackBtn}
        onClick={() => openUrl('https://t.me/zamalaf')}
        title="Написать отзыв в Telegram"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
        </svg>
        <span>Фидбек</span>
      </button>
    </div>
  )
}
