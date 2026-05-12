import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Delete } from 'lucide-react'
import styles from './LockScreen.module.css'

interface Props {
  mode: 'lock' | 'setup'
  onUnlock?: (pin: string) => boolean
  onSetup?: (pin: string) => void
  onCancel?: () => void
}

export default function LockScreen({ mode, onUnlock, onSetup, onCancel }: Props) {
  const [digits, setDigits] = useState<string[]>([])
  const [step, setStep] = useState<'enter' | 'confirm'>('enter')
  const [firstPin, setFirstPin] = useState('')
  const [shaking, setShaking] = useState(false)
  const [error, setError] = useState('')

  function addDigit(d: string) {
    if (digits.length >= 4) return
    const next = [...digits, d]
    setDigits(next)
    setError('')

    if (next.length === 4) {
      const pin = next.join('')
      setTimeout(() => handleComplete(pin), 120)
    }
  }

  function removeDigit() {
    setDigits(prev => prev.slice(0, -1))
    setError('')
  }

  function handleComplete(pin: string) {
    if (mode === 'lock') {
      const ok = onUnlock?.(pin)
      if (!ok) {
        setShaking(true)
        setError('Неверный PIN')
        setDigits([])
        setTimeout(() => setShaking(false), 500)
      }
    } else {
      if (step === 'enter') {
        setFirstPin(pin)
        setStep('confirm')
        setDigits([])
      } else {
        if (pin === firstPin) {
          onSetup?.(pin)
        } else {
          setShaking(true)
          setError('PIN не совпадает, попробуй снова')
          setStep('enter')
          setFirstPin('')
          setDigits([])
          setTimeout(() => setShaking(false), 500)
        }
      }
    }
  }

  const label =
    mode === 'lock' ? 'Введите PIN' :
    step === 'enter' ? 'Новый PIN — 4 цифры' :
    'Повторите PIN'

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className={styles.card}
        animate={shaking ? { x: [0, -10, 10, -8, 8, -4, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        <div className={styles.icon}>
          <Lock size={22} />
        </div>
        <div className={styles.appName}>Dnevchik</div>
        <div className={styles.label}>{label}</div>

        <div className={styles.dots}>
          {[0, 1, 2, 3].map(i => (
            <span
              key={i}
              className={`${styles.dot} ${i < digits.length ? styles.dotFilled : ''}`}
            />
          ))}
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              className={styles.error}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className={styles.numpad}>
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button key={d} className={styles.key} onClick={() => addDigit(d)}>
              {d}
            </button>
          ))}
          <button className={`${styles.key} ${styles.keyAction}`} onClick={removeDigit}>
            <Delete size={16} />
          </button>
          <button className={styles.key} onClick={() => addDigit('0')}>0</button>
          <div className={styles.keyEmpty} />
        </div>

        {(mode === 'setup' || mode === 'lock') && onCancel && (
          <button className={styles.cancelBtn} onClick={onCancel}>
            Отмена
          </button>
        )}
      </motion.div>
    </motion.div>
  )
}
