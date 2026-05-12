import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Code, Heading1, Heading2, List, ListOrdered, Quote, Minus,
  Undo, Redo, ImageIcon,
} from 'lucide-react'
import type { MediaFile } from '../types'
import styles from './RichEditor.module.css'

interface ToolBtnProps {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}

function ToolBtn({ onClick, active, title, children }: ToolBtnProps) {
  return (
    <button
      className={`${styles.toolBtn} ${active ? styles.toolBtnActive : ''}`}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
    >
      {children}
    </button>
  )
}

interface Props {
  content: string
  onChange: (html: string) => void
  editorFont?: string
  spellCheck?: boolean
  placeholder?: string
  onMediaAdd?: (file: MediaFile) => void
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function RichEditor({ content, onChange, editorFont = 'sans', spellCheck = false, placeholder = 'Начни писать...', onMediaAdd }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({ placeholder }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: styles.editorContent,
        spellcheck: String(spellCheck),
      },
    },
  })

  async function insertImageFile(file: File) {
    if (!editor) return
    const dataUrl = await fileToBase64(file)
    editor.chain().focus().setImage({ src: dataUrl }).run()
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    const files = Array.from(e.dataTransfer.files)
    const hasMedia = files.some(f =>
      f.type.startsWith('image/') || f.type.startsWith('audio/') || f.type.startsWith('video/')
    )
    if (!hasMedia) return

    e.preventDefault()
    e.stopPropagation()

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        await insertImageFile(file)
      } else if ((file.type.startsWith('audio/') || file.type.startsWith('video/')) && onMediaAdd) {
        const dataUrl = await fileToBase64(file)
        onMediaAdd({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type.startsWith('audio/') ? 'audio' : 'video',
          dataUrl,
        })
      }
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    const types = Array.from(e.dataTransfer.types)
    if (types.includes('Files')) {
      e.preventDefault()
    }
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find(item => item.type.startsWith('image/'))
    if (!imageItem || !editor) return
    e.preventDefault()
    const file = imageItem.getAsFile()
    if (file) await insertImageFile(file)
  }

  async function handleImageUpload() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (file) await insertImageFile(file)
    }
    input.click()
  }

  if (!editor) return null

  const fontClass = editorFont === 'mono' ? styles.fontMono : editorFont === 'serif' ? styles.fontSerif : ''

  return (
    <div
      className={styles.wrap}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onPaste={handlePaste}
    >
      <div className={styles.toolbar}>
        <div className={styles.toolGroup}>
          <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Отменить (Ctrl+Z)">
            <Undo size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Повторить (Ctrl+Y)">
            <Redo size={14} />
          </ToolBtn>
        </div>
        <div className={styles.toolDivider} />
        <div className={styles.toolGroup}>
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Жирный (Ctrl+B)">
            <Bold size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Курсив (Ctrl+I)">
            <Italic size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Подчёркивание (Ctrl+U)">
            <UnderlineIcon size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Зачёркивание">
            <Strikethrough size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Код">
            <Code size={14} />
          </ToolBtn>
        </div>
        <div className={styles.toolDivider} />
        <div className={styles.toolGroup}>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Заголовок 1">
            <Heading1 size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Заголовок 2">
            <Heading2 size={14} />
          </ToolBtn>
        </div>
        <div className={styles.toolDivider} />
        <div className={styles.toolGroup}>
          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Список">
            <List size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Нумерованный список">
            <ListOrdered size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Цитата">
            <Quote size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Разделитель">
            <Minus size={14} />
          </ToolBtn>
        </div>
        <div className={styles.toolDivider} />
        <div className={styles.toolGroup}>
          <ToolBtn onClick={handleImageUpload} title="Вставить изображение">
            <ImageIcon size={14} />
          </ToolBtn>
        </div>
      </div>

      <EditorContent editor={editor} className={`${styles.editorWrap} ${fontClass}`} />
    </div>
  )
}
