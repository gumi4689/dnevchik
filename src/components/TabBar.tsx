import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import styles from './TabBar.module.css'

// ── Inline interfaces ──────────────────────────────────────────────────────
interface OpenTab {
  id: string
  entryId?: string
  title: string
  groupId?: string
  isDirty?: boolean
}

interface TabGroup {
  id: string
  name: string
  color: string
}

interface TabBarProps {
  tabs: OpenTab[]
  groups: TabGroup[]
  activeTabId: string | null
  onTabClick: (tabId: string) => void
  onTabClose: (tabId: string) => void
  onTabNew: () => void
  onCreateGroup: (tabId1: string, tabId2: string) => void
  onAddToGroup: (tabId: string, groupId: string) => void
  onRenameGroup: (groupId: string, name: string) => void
  onUngroupGroup: (groupId: string) => void
  onDeleteGroup: (groupId: string) => void
}

// ── Internal state types ───────────────────────────────────────────────────
interface ContextMenuState {
  tabId: string
  groupId: string
  x: number
  y: number
}

interface RenamingState {
  groupId: string
  value: string
}

// ── Component ──────────────────────────────────────────────────────────────
export default function TabBar({
  tabs,
  groups,
  activeTabId,
  onTabClick,
  onTabClose,
  onTabNew,
  onCreateGroup,
  onAddToGroup,
  onRenameGroup,
  onUngroupGroup,
  onDeleteGroup,
}: TabBarProps) {
  const draggedTabId = useRef<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [renaming, setRenaming] = useState<RenamingState | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close context menu on outside click or Escape
  useEffect(() => {
    if (!contextMenu) return

    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
        setRenaming(null)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setContextMenu(null)
        setRenaming(null)
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu])

  // ── Drag handlers ────────────────────────────────────────────────────────
  function handleDragStart(tabId: string) {
    draggedTabId.current = tabId
  }

  function handleDragOver(e: React.DragEvent, tabId: string) {
    e.preventDefault()
    if (draggedTabId.current && draggedTabId.current !== tabId) {
      setDropTargetId(tabId)
    }
  }

  function handleDragLeave() {
    setDropTargetId(null)
  }

  function handleDrop(e: React.DragEvent, targetTab: OpenTab) {
    e.preventDefault()
    setDropTargetId(null)
    const draggedId = draggedTabId.current
    draggedTabId.current = null
    if (!draggedId || draggedId === targetTab.id) return

    const draggedTab = tabs.find(t => t.id === draggedId)
    if (!draggedTab) return

    if (targetTab.groupId) {
      // Drop onto a grouped tab → add dragged to that group
      onAddToGroup(draggedId, targetTab.groupId)
    } else if (!draggedTab.groupId && !targetTab.groupId) {
      // Both ungrouped → create a new group
      onCreateGroup(draggedId, targetTab.id)
    } else if (draggedTab.groupId === targetTab.groupId) {
      // Same group → create a new group (splits off)
      onCreateGroup(draggedId, targetTab.id)
    } else {
      // Dragged has a group, target ungrouped → create group with target
      onCreateGroup(draggedId, targetTab.id)
    }
  }

  // ── Context menu ─────────────────────────────────────────────────────────
  function handleContextMenu(e: React.MouseEvent, tab: OpenTab) {
    if (!tab.groupId) return
    e.preventDefault()
    setContextMenu({ tabId: tab.id, groupId: tab.groupId, x: e.clientX, y: e.clientY })
    setRenaming(null)
  }

  function handleRenameClick() {
    if (!contextMenu) return
    const group = groups.find(g => g.id === contextMenu.groupId)
    setRenaming({ groupId: contextMenu.groupId, value: group?.name ?? '' })
  }

  function handleRenameSubmit() {
    if (!renaming) return
    onRenameGroup(renaming.groupId, renaming.value.trim() || 'Группа')
    setContextMenu(null)
    setRenaming(null)
  }

  function handleUngroup() {
    if (!contextMenu) return
    onUngroupGroup(contextMenu.groupId)
    setContextMenu(null)
    setRenaming(null)
  }

  function handleDeleteGroup() {
    if (!contextMenu) return
    onDeleteGroup(contextMenu.groupId)
    setContextMenu(null)
    setRenaming(null)
  }

  // ── Rendering helpers ────────────────────────────────────────────────────
  function renderTab(tab: OpenTab, borderColor?: string) {
    const isActive = tab.id === activeTabId
    const isDropTarget = tab.id === dropTargetId

    return (
      <motion.div
        key={tab.id}
        className={[
          styles.tab,
          isActive ? styles.tabActive : '',
          isDropTarget ? styles.dropTarget : '',
        ].join(' ')}
        style={borderColor ? { borderLeft: `3px solid ${borderColor}` } : undefined}
        draggable
        onDragStart={() => handleDragStart(tab.id)}
        onDragOver={e => handleDragOver(e, tab.id)}
        onDragLeave={handleDragLeave}
        onDrop={e => handleDrop(e, tab)}
        onClick={() => onTabClick(tab.id)}
        onContextMenu={e => handleContextMenu(e, tab)}
        title={tab.title}
        initial={{ opacity: 0, scaleX: 0.8 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        layout
      >
        {tab.isDirty && <span className={styles.dirtyDot} />}
        <span className={styles.tabTitle}>{tab.title || 'Без названия'}</span>
        <button
          className={styles.closeBtn}
          onClick={e => { e.stopPropagation(); onTabClose(tab.id) }}
          tabIndex={-1}
          aria-label="Закрыть вкладку"
        >
          <X size={11} />
        </button>
      </motion.div>
    )
  }

  // Separate ungrouped and grouped tabs
  const ungroupedTabs = tabs.filter(t => !t.groupId)

  // Build group → tabs map preserving order
  const groupedMap = new Map<string, OpenTab[]>()
  tabs.forEach(t => {
    if (t.groupId) {
      if (!groupedMap.has(t.groupId)) groupedMap.set(t.groupId, [])
      groupedMap.get(t.groupId)!.push(t)
    }
  })

  // Determine render order: ungrouped tabs first, then groups
  // Interleave according to original tab order: find first tab of each group
  type BarItem = { kind: 'tab'; tab: OpenTab } | { kind: 'group'; groupId: string }
  const barItems: BarItem[] = []
  const seenGroups = new Set<string>()

  tabs.forEach(t => {
    if (!t.groupId) {
      barItems.push({ kind: 'tab', tab: t })
    } else if (!seenGroups.has(t.groupId)) {
      seenGroups.add(t.groupId)
      barItems.push({ kind: 'group', groupId: t.groupId })
    }
  })

  return (
    <>
      <div className={styles.bar}>
        {barItems.map(item => {
          if (item.kind === 'tab') {
            return renderTab(item.tab)
          }

          // Group
          const group = groups.find(g => g.id === item.groupId)
          const groupTabs = groupedMap.get(item.groupId) ?? []
          if (!group) return null

          return (
            <div key={item.groupId} className={styles.group}>
              <div className={styles.groupHeader}>
                <span
                  className={styles.groupDot}
                  style={{ background: group.color }}
                />
                <span className={styles.groupName}>{group.name}</span>
              </div>
              <div className={styles.groupTabs}>
                {groupTabs.map(t => renderTab(t, group.color))}
              </div>
            </div>
          )
        })}

        {/* New tab button */}
        <button
          className={styles.addBtn}
          onClick={onTabNew}
          aria-label="Новая вкладка"
          title="Новая вкладка"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {renaming && renaming.groupId === contextMenu.groupId ? (
            <div className={styles.menuRenameRow}>
              <input
                className={styles.menuInput}
                autoFocus
                value={renaming.value}
                onChange={e => setRenaming({ ...renaming, value: e.target.value })}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRenameSubmit()
                  if (e.key === 'Escape') { setContextMenu(null); setRenaming(null) }
                }}
                placeholder="Название группы"
              />
            </div>
          ) : (
            <>
              <button className={styles.menuItem} onClick={handleRenameClick}>
                Переименовать
              </button>
              <button className={styles.menuItem} onClick={handleUngroup}>
                Разгруппировать
              </button>
              <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={handleDeleteGroup}>
                Удалить группу
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
