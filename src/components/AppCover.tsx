import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './AppCover.module.css'

export default function AppCover({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 500)
    }, 1600)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={styles.cover}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.45, ease: 'easeIn' as const }}
        >
          <motion.div
            className={styles.inner}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' as const }}
          >
            <div className={styles.bookIcon}>
              <div className={styles.bookLeft} />
              <div className={styles.bookRight}>
                <div className={styles.bookLine} />
                <div className={styles.bookLine} />
                <div className={styles.bookLine} />
              </div>
            </div>
            <h1 className={styles.title}>Dnevchik</h1>
            <p className={styles.date}>
              {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
