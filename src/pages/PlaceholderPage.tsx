import { motion } from 'framer-motion'
import styles from './PlaceholderPage.module.css'

interface Props {
  icon: React.ReactNode
  title: string
  description: string
}

export default function PlaceholderPage({ icon, title, description }: Props) {
  return (
    <div className={styles.page}>
      <motion.div
        className={styles.inner}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' as const }}
      >
        <span className={styles.icon}>{icon}</span>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.desc}>{description}</p>
      </motion.div>
    </div>
  )
}
