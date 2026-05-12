import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, FolderOpen, FolderPlus, BookOpen, Zap } from 'lucide-react'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import type { UserProfile } from '../types'
import styles from './Onboarding.module.css'

interface Props {
  onDone: (profile: UserProfile, dataDir: string) => void
}

const TOTAL_STEPS = 4

export default function Onboarding({ onDone }: Props) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [bio, setBio] = useState('')

  function next() { setStep(s => s + 1) }
  function prev() { setStep(s => s - 1) }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value.replace(/[^a-zA-Zа-яёА-ЯЁ\s-]/g, ''))
  }

  function handleAgeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAge(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))
  }

  async function chooseCustomDir() {
    const dir = await openDialog({ directory: true, title: 'Выбрать место для хранилища' })
    if (dir) finish(dir as string)
  }

  async function chooseImport() {
    const dir = await openDialog({ directory: true, title: 'Выбрать папку с данными' })
    if (dir) finish(dir as string)
  }

  function chooseAuto() {
    finish('%APPDATA%\\Dnevchik')
  }

  function finish(dataDir: string) {
    onDone({ name, age, bio }, dataDir)
  }

  return (
    <div className={styles.overlay}>
      <AnimatePresence mode="wait">
        {step === 0 && (
          <Step key="welcome">
            <motion.div
              className={styles.logo}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 18 }}
            >
              <BookOpen size={52} strokeWidth={1.4} />
            </motion.div>
            <motion.h1
              className={styles.welcomeTitle}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.35 }}
            >
              Dnevchik
            </motion.h1>
            <motion.p
              className={styles.welcomeSub}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              Личный дневник, который хранится только у вас.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.3 }}
            >
              <button className={styles.primaryBtn} onClick={next}>
                Начать <ChevronRight size={16} />
              </button>
            </motion.div>
          </Step>
        )}

        {step === 1 && (
          <Step key="name">
            <StepHeader current={1} total={TOTAL_STEPS - 1} />
            <h2 className={styles.stepTitle}>Как вас зовут?</h2>
            <p className={styles.stepSub}>Можно пропустить — это только для приветствия</p>
            <input
              autoFocus
              className={styles.input}
              placeholder="Ваше имя"
              value={name}
              onChange={handleNameChange}
              onKeyDown={e => e.key === 'Enter' && next()}
            />
            <div className={styles.btnRow}>
              <button className={styles.backBtn} onClick={prev}><ChevronLeft size={16} /></button>
              <button className={styles.skipBtn} onClick={next}>Пропустить</button>
              <button className={styles.primaryBtn} onClick={next}>Далее <ChevronRight size={16} /></button>
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step key="age">
            <StepHeader current={2} total={TOTAL_STEPS - 1} />
            <h2 className={styles.stepTitle}>Расскажите о себе</h2>
            <p className={styles.stepSub}>Эти данные хранятся только на вашем устройстве</p>
            <input
              autoFocus
              className={styles.input}
              placeholder="Возраст"
              value={age}
              onChange={handleAgeChange}
              inputMode="numeric"
            />
            <div className={styles.btnRow}>
              <button className={styles.backBtn} onClick={prev}><ChevronLeft size={16} /></button>
              <button className={styles.skipBtn} onClick={next}>Пропустить</button>
              <button className={styles.primaryBtn} onClick={next}>Далее <ChevronRight size={16} /></button>
            </div>
          </Step>
        )}

        {step === 3 && (
          <Step key="source">
            <StepHeader current={3} total={TOTAL_STEPS - 1} />
            <h2 className={styles.stepTitle}>Где хранить данные?</h2>
            <p className={styles.stepSub}>Выберите место для хранилища</p>
            <div className={styles.sourceCards}>
              <button className={`${styles.sourceCard} ${styles.sourceCardAuto}`} onClick={chooseAuto}>
                <Zap size={22} strokeWidth={1.4} />
                <div className={styles.sourceCardText}>
                  <span className={styles.sourceCardTitle}>Автоматически</span>
                  <span className={styles.sourceCardSub}>Создать в <code>%APPDATA%\Dnevchik</code></span>
                </div>
              </button>
              <button className={styles.sourceCard} onClick={chooseCustomDir}>
                <FolderPlus size={22} strokeWidth={1.4} />
                <div className={styles.sourceCardText}>
                  <span className={styles.sourceCardTitle}>Выбрать место</span>
                  <span className={styles.sourceCardSub}>Указать папку для нового хранилища</span>
                </div>
              </button>
              <button className={styles.sourceCard} onClick={chooseImport}>
                <FolderOpen size={22} strokeWidth={1.4} />
                <div className={styles.sourceCardText}>
                  <span className={styles.sourceCardTitle}>Импортировать</span>
                  <span className={styles.sourceCardSub}>Подключить существующую папку с записями</span>
                </div>
              </button>
            </div>
            <button className={styles.backBtn} onClick={prev} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
              <ChevronLeft size={16} /> Назад
            </button>
          </Step>
        )}
      </AnimatePresence>
    </div>
  )
}

function Step({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

function StepHeader({ current, total }: { current: number; total: number }) {
  return (
    <div className={styles.progress}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`${styles.dot} ${i < current ? styles.dotDone : ''} ${i === current - 1 ? styles.dotActive : ''}`}
        />
      ))}
    </div>
  )
}
