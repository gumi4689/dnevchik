import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Frown, Meh, Minus, Smile, Laugh, X } from 'lucide-react'
import styles from './MoodPage.module.css'

interface Props {
  onSave: (mood: number, reasons: string[]) => void
  onCreateEntry: (mood: number, reasons: string[]) => void
  onClose: () => void
  initialMood?: number | null
}

interface EmotionOption {
  value: number
  label: string
  icon: React.ReactNode
  color: string
}

const EMOTIONS: EmotionOption[] = [
  { value: 1,  label: 'Очень плохо', icon: <Frown size={36} />,  color: '#ef4444' },
  { value: 3,  label: 'Плохо',       icon: <Meh size={36} />,    color: '#f59e0b' },
  { value: 5,  label: 'Нейтрально',  icon: <Minus size={36} />,  color: 'var(--text-muted)' },
  { value: 7,  label: 'Приятно',     icon: <Smile size={36} />,  color: 'var(--accent)' },
  { value: 10, label: 'Отлично',     icon: <Laugh size={36} />,  color: '#4ade80' },
]

const REASONS = [
  { key: 'work',          label: '💼 Работа' },
  { key: 'health',        label: '🏃 Здоровье' },
  { key: 'relationships', label: '💕 Отношения' },
  { key: 'weather',       label: '🌤 Погода' },
  { key: 'sleep',         label: '😴 Сон' },
  { key: 'food',          label: '🍕 Еда' },
  { key: 'sport',         label: '💪 Спорт' },
  { key: 'social',        label: '👥 Общение' },
  { key: 'achievements',  label: '🏆 Достижения' },
  { key: 'other',         label: '✨ Другое' },
]

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, type: 'spring' as const, stiffness: 300, damping: 24 },
  }),
}

const reasonsContainerVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: { duration: 0.28, ease: 'easeOut' as const, staggerChildren: 0.04, delayChildren: 0.05 },
  },
  exit: { opacity: 0, height: 0, transition: { duration: 0.2, ease: 'easeIn' as const } },
}

const chipVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 320, damping: 22 } },
}

export default function MoodPage({ onSave, onCreateEntry, onClose, initialMood }: Props) {
  const [selectedMood, setSelectedMood] = useState<number | null>(initialMood ?? null)
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])

  const selectedEmotion = EMOTIONS.find(e => e.value === selectedMood)

  const toggleReason = (key: string) => {
    setSelectedReasons(prev =>
      prev.includes(key) ? prev.filter(r => r !== key) : [...prev, key]
    )
  }

  const handleSave = () => {
    if (selectedMood !== null) onSave(selectedMood, selectedReasons)
  }

  const handleCreateEntry = () => {
    if (selectedMood !== null) onCreateEntry(selectedMood, selectedReasons)
  }

  return (
    <motion.div
      className={styles.page}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>Как вы себя чувствуете?</h2>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
          <X size={18} />
        </button>
      </div>

      <div className={styles.emotionGrid}>
        {EMOTIONS.map((emotion, i) => {
          const isSelected = selectedMood === emotion.value
          return (
            <motion.button
              key={emotion.value}
              className={`${styles.emotionCard} ${isSelected ? styles.emotionCardSelected : ''}`}
              style={{
                '--emotion-color': emotion.color,
              } as React.CSSProperties}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileTap={{ scale: 0.93 }}
              onClick={() => setSelectedMood(emotion.value)}
              aria-pressed={isSelected}
            >
              <span style={{ color: emotion.color }} className={styles.emotionIcon}>
                {emotion.icon}
              </span>
              <span className={styles.emotionLabel}>{emotion.label}</span>
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence>
        {selectedMood !== null && (
          <motion.div
            className={styles.reasonsSection}
            variants={reasonsContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <p className={styles.reasonsTitle}>Что повлияло на ваше настроение?</p>
            <div className={styles.reasonGrid}>
              {REASONS.map(reason => {
                const isSelected = selectedReasons.includes(reason.key)
                return (
                  <motion.button
                    key={reason.key}
                    className={`${styles.reasonChip} ${isSelected ? styles.reasonChipSelected : ''}`}
                    variants={chipVariants}
                    onClick={() => toggleReason(reason.key)}
                    aria-pressed={isSelected}
                  >
                    {reason.label}
                  </motion.button>
                )
              })}
            </div>

            <motion.div
              className={styles.actions}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.18 }}
            >
              <button className={styles.btnPrimary} onClick={handleSave}>
                Сохранить настроение
              </button>
              <button className={styles.btnSecondary} onClick={handleCreateEntry}>
                Создать запись
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
