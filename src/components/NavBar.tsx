import { motion } from 'framer-motion'
import { Home, PenLine, Search, Settings } from 'lucide-react'
import type { Tab } from '../types'
import styles from './NavBar.module.css'

const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: 'home',     icon: <Home size={22} />,     label: 'Главная' },
  { id: 'new',      icon: <PenLine size={26} />,  label: 'Запись' },
  { id: 'search',   icon: <Search size={22} />,   label: 'Поиск' },
  { id: 'settings', icon: <Settings size={22} />, label: 'Настройки' },
]

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

export default function NavBar({ active, onChange }: Props) {
  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => {
        const isActive = tab.id === active
        const isCta = tab.id === 'new'

        return (
          <button
            key={tab.id}
            className={`${styles.item} ${isCta ? styles.cta : ''} ${isActive && !isCta ? styles.active : ''}`}
            onClick={() => onChange(tab.id)}
            aria-label={tab.label}
          >
            {isCta ? (
              <motion.span
                className={styles.ctaInner}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
              >
                {tab.icon}
              </motion.span>
            ) : (
              <motion.span
                className={styles.iconWrap}
                whileTap={{ scale: 0.85 }}
              >
                {tab.icon}
                {isActive && (
                  <motion.span
                    className={styles.dot}
                    layoutId="nav-dot"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.span>
            )}
            {!isCta && <span className={styles.label}>{tab.label}</span>}
          </button>
        )
      })}
    </nav>
  )
}
