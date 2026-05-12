import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Pen, Eraser, Type, Undo2, Trash2, Check, X } from 'lucide-react'
import styles from './DrawingCanvas.module.css'

interface Props {
  initialImage?: string
  onDone: (dataUrl: string) => void
  onCancel: () => void
}

type Tool = 'pen' | 'eraser' | 'text'
type BrushSize = 'small' | 'medium' | 'large'

const BRUSH_SIZES: Record<BrushSize, number> = { small: 2, medium: 5, large: 12 }

const COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f59e0b',
  '#4ade80', '#38bdf8', '#7c6ee0', '#fb7185',
]

export default function DrawingCanvas({ initialImage, onDone, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState<BrushSize>('medium')
  const [history, setHistory] = useState<ImageData[]>([])

  // Text input state
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null)
  const [textValue, setTextValue] = useState('')

  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  // ── Canvas setup ──────────────────────────────────────────────────────────

  const getCtx = useCallback((): CanvasRenderingContext2D | null => {
    return canvasRef.current?.getContext('2d') ?? null
  }, [])

  const getCanvasSize = useCallback(() => {
    const wrap = wrapRef.current
    if (!wrap) return { width: 800, height: 600 }
    return { width: wrap.clientWidth, height: wrap.clientHeight }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const { width, height } = getCanvasSize()
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    if (initialImage) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, width, height)
      img.src = initialImage
    }
  }, [initialImage, getCanvasSize])

  // ── History helpers ───────────────────────────────────────────────────────

  const pushHistory = useCallback(() => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory(prev => [...prev, snap])
  }, [getCtx])

  const handleUndo = () => {
    const ctx = getCtx()
    if (!ctx || history.length === 0) return
    const prev = history[history.length - 1]
    ctx.putImageData(prev, 0, 0)
    setHistory(h => h.slice(0, -1))
  }

  const handleClear = () => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    pushHistory()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  // ── Coordinate helper ─────────────────────────────────────────────────────

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const touch = e.touches[0]
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  // ── Drawing ───────────────────────────────────────────────────────────────

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'text') {
      // Commit any in-progress text first
      commitText()
      const pos = getPos(e)
      setTextPos(pos)
      setTextValue('')
      return
    }

    pushHistory()
    isDrawing.current = true
    lastPos.current = getPos(e)

    const ctx = getCtx()
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || tool === 'text') return
    const ctx = getCtx()
    if (!ctx) return

    const pos = getPos(e)
    const size = BRUSH_SIZES[brushSize]

    if (tool === 'eraser') {
      ctx.clearRect(pos.x - size / 2, pos.y - size / 2, size, size)
      // Also fill white so it shows on white background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(pos.x - size / 2, pos.y - size / 2, size, size)
    } else {
      ctx.lineWidth = size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = color
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }

    lastPos.current = pos
  }

  const stopDraw = () => {
    isDrawing.current = false
    lastPos.current = null
  }

  // ── Text tool ─────────────────────────────────────────────────────────────

  const commitText = useCallback(() => {
    if (!textPos || !textValue.trim()) {
      setTextPos(null)
      setTextValue('')
      return
    }
    const ctx = getCtx()
    if (!ctx) return

    const fontSize = BRUSH_SIZES[brushSize] * 6 + 10
    ctx.font = `${fontSize}px var(--font-body, sans-serif)`
    ctx.fillStyle = color
    ctx.fillText(textValue, textPos.x, textPos.y)

    setTextPos(null)
    setTextValue('')
  }, [textPos, textValue, brushSize, color, getCtx])

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      pushHistory()
      commitText()
    }
    if (e.key === 'Escape') {
      setTextPos(null)
      setTextValue('')
    }
  }

  // ── Done / Cancel ─────────────────────────────────────────────────────────

  const handleDone = () => {
    // Commit any pending text before exporting
    if (textPos && textValue.trim()) {
      const ctx = getCtx()
      if (ctx) {
        const fontSize = BRUSH_SIZES[brushSize] * 6 + 10
        ctx.font = `${fontSize}px var(--font-body, sans-serif)`
        ctx.fillStyle = color
        ctx.fillText(textValue, textPos.x, textPos.y)
      }
    }
    const canvas = canvasRef.current
    if (canvas) onDone(canvas.toDataURL('image/png'))
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const textFontSize = BRUSH_SIZES[brushSize] * 6 + 10

  // Position the text input relative to the canvas element
  const canvasRect = canvasRef.current?.getBoundingClientRect()
  const wrapRect = wrapRef.current?.getBoundingClientRect()
  const textInputLeft = textPos && canvasRect && wrapRect
    ? canvasRect.left - wrapRect.left + textPos.x * (canvasRect.width / (canvasRef.current?.width ?? 1))
    : 0
  const textInputTop = textPos && canvasRect && wrapRect
    ? canvasRect.top - wrapRect.top + textPos.y * (canvasRect.height / (canvasRef.current?.height ?? 1)) - textFontSize
    : 0

  return (
    <div className={styles.overlay}>
      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className={styles.toolbar}>

        {/* Tools */}
        <div className={styles.toolGroup}>
          <button
            className={`${styles.toolBtn} ${tool === 'pen' ? styles.toolBtnActive : ''}`}
            onClick={() => setTool('pen')}
            title="Ручка"
            aria-pressed={tool === 'pen'}
          >
            <Pen size={16} />
          </button>
          <button
            className={`${styles.toolBtn} ${tool === 'eraser' ? styles.toolBtnActive : ''}`}
            onClick={() => setTool('eraser')}
            title="Ластик"
            aria-pressed={tool === 'eraser'}
          >
            <Eraser size={16} />
          </button>
          <button
            className={`${styles.toolBtn} ${tool === 'text' ? styles.toolBtnActive : ''}`}
            onClick={() => setTool('text')}
            title="Текст"
            aria-pressed={tool === 'text'}
          >
            <Type size={16} />
          </button>
        </div>

        <div className={styles.divider} />

        {/* Color palette */}
        <div className={styles.toolGroup}>
          {COLORS.map(c => (
            <button
              key={c}
              className={`${styles.colorBtn} ${c === color ? styles.colorBtnActive : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
              title={c}
              aria-pressed={c === color}
            />
          ))}
        </div>

        <div className={styles.divider} />

        {/* Brush size */}
        <div className={styles.toolGroup}>
          {(['small', 'medium', 'large'] as BrushSize[]).map(s => (
            <button
              key={s}
              className={`${styles.sizeBtn} ${brushSize === s ? styles.sizeBtnActive : ''}`}
              onClick={() => setBrushSize(s)}
              aria-pressed={brushSize === s}
            >
              <span
                className={styles.sizeDot}
                style={{ width: BRUSH_SIZES[s] * 2, height: BRUSH_SIZES[s] * 2 }}
              />
            </button>
          ))}
        </div>

        <div className={styles.divider} />

        {/* Actions */}
        <div className={styles.toolGroup}>
          <button
            className={styles.toolBtn}
            onClick={handleUndo}
            disabled={history.length === 0}
            title="Отменить"
          >
            <Undo2 size={16} />
          </button>
          <button
            className={styles.toolBtn}
            onClick={handleClear}
            title="Очистить"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className={styles.spacer} />

        {/* Done / Cancel */}
        <div className={styles.toolGroup}>
          <button className={styles.btnCancel} onClick={onCancel}>
            <X size={15} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Отмена
          </button>
          <button className={styles.btnDone} onClick={handleDone}>
            <Check size={15} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Готово
          </button>
        </div>
      </div>

      {/* ── Canvas area ──────────────────────────────────────────────── */}
      <div className={styles.canvasWrap} ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          style={{ cursor: tool === 'text' ? 'text' : tool === 'eraser' ? 'cell' : 'crosshair' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
        />

        {/* Floating text input */}
        {textPos && (
          <input
            autoFocus
            className={styles.textInput}
            style={{
              left: textInputLeft,
              top: textInputTop,
              fontSize: textFontSize,
              color: color,
              minWidth: 120,
            }}
            value={textValue}
            onChange={e => setTextValue(e.target.value)}
            onKeyDown={handleTextKeyDown}
            onBlur={() => {
              pushHistory()
              commitText()
            }}
          />
        )}
      </div>
    </div>
  )
}
