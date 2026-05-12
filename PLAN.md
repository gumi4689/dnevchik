# PLAN.md — Личный дневник

## Архитектура (пересмотрена)

**Без Docker и сервера.** Всё хранится локально:

```
%APPDATA%\Dnevchik\
├── dnevchik.db          — SQLite (зашифрован SQLCipher)
├── media\               — фото, аудио, файлы
│   ├── images\
│   ├── audio\
│   └── files\
└── exports\             — ZIP-архивы, PDF
```

- **Клиент:** Tauri 2 + React 18 + TypeScript + Vite + Framer Motion
- **БД:** SQLite + SQLCipher (AES-256) + FTS5 (полнотекстовый поиск)
- **Файлы:** локальная папка, имена → UUID
- **Авторизации нет** — приложение полностью офлайн и приватно

---

## Этапы

| # | Этап | Задачи | Статус |
|---|------|--------|--------|
| 1 | **UI-оболочка** | React + Vite + темы + навигация + анимации | ✅ Готово |
| 2 | **Редактор** | TipTap, автосохранение, форматирование (B/I/U/списки) | 🔲 |
| 3 | **SQLite локально** | rusqlite + SQLCipher, CRUD записей, FTS5 | 🔲 |
| 4 | **Tauri-обёртка** | Tauri commands, window config, системный трей | 🔲 |
| 5 | **Медиафайлы** | Фото (drag&drop), аудио (диктофон + WaveSurfer) | 🔲 |
| 6 | **Календарь** | Полный календарный вид, фильтрация по дате | 🔲 |
| 7 | **Поиск** | FTS5 поиск, теги, категории, фильтры | 🔲 |
| 8 | **Трекер настроения** | График за период, история | 🔲 |
| 9 | **Экспорт** | Markdown, PDF, ZIP-архив дневника | 🔲 |
| 10 | **Финал** | Иконка, сборка .exe installer, CHANGELOG | 🔲 |

---

## Ключевые решения

| Решение | Детали |
|---------|--------|
| Хранилище | SQLite через `rusqlite` + `SQLCipher` |
| Шифрование | AES-256, ключ = PBKDF2(мастер-пароль, salt, 310 000 итераций) |
| Медиафайлы | Копируются в `%APPDATA%\Dnevchik\media\`, имя → UUID |
| Формат записей | Markdown + JSON-метаданные |
| Темы | 4 темы (CSS-переменные): тёмная, светлая, ч/б, тёплая |
| Поиск | SQLite FTS5 (`content`, `title`, `tags`) |
| Автосохранение | Каждые 30 сек + при каждом значимом действии |
| Сборка | `tauri build` → NSIS installer для Windows |

---

## Схема БД (SQLite)

```sql
CREATE TABLE entries (
  id          TEXT PRIMARY KEY,           -- UUID v4
  title       TEXT,
  content     TEXT,                       -- Markdown
  mood        INTEGER CHECK (mood BETWEEN 0 AND 10),
  tags        TEXT,                       -- JSON array
  location    TEXT,                       -- JSON {lat,lng,name} или NULL
  is_archived INTEGER DEFAULT 0,
  created_at  TEXT NOT NULL,             -- ISO 8601
  updated_at  TEXT NOT NULL
);

CREATE TABLE media (
  id          TEXT PRIMARY KEY,
  entry_id    TEXT REFERENCES entries(id),
  type        TEXT,                       -- image | audio | video | file
  filename    TEXT,
  path        TEXT,
  size_bytes  INTEGER,
  created_at  TEXT NOT NULL
);

CREATE TABLE categories (
  id          TEXT PRIMARY KEY,
  parent_id   TEXT REFERENCES categories(id),
  name        TEXT NOT NULL
);

CREATE VIRTUAL TABLE entries_fts USING fts5(
  title, content, tags,
  content=entries, content_rowid=rowid
);
```

---

## Текущее состояние

**Этап 1 завершён.** Реализовано:
- React 18 + TypeScript + Vite
- 4 темы (CSS-переменные, localStorage)
- Навигация (5 вкладок, Framer Motion анимации)
- Главная: приветствие по времени суток, статистика, список записей (моковые данные)
- Редактор: заголовок + текстаря + трекер настроения с анимированной фигурой (MoodShape)
- Настройки: выбор темы с превью
- Метка «Неавторизован» постоянно видна

**Следующий шаг:** Этап 2 — подключить TipTap вместо `<textarea>`, добавить полное форматирование.
