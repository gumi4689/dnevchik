export interface Template {
  id: string
  name: string
  emoji: string
  description: string
  title: string
  content: string
}

export const TEMPLATES: Template[] = [
  {
    id: 'free',
    name: 'Свободная запись',
    emoji: '✍️',
    description: 'Чистый лист — пиши что хочется',
    title: '',
    content: '',
  },
  {
    id: 'morning',
    name: 'Утренние страницы',
    emoji: '🌅',
    description: 'Поток сознания, 3 страницы не отрываясь',
    title: 'Утренние страницы',
    content: `<p>Сегодня я думаю о...</p><p><br></p><p>Что меня беспокоит прямо сейчас...</p><p><br></p><p>Что меня радует...</p><p><br></p>`,
  },
  {
    id: 'reflection',
    name: 'Рефлексия дня',
    emoji: '🌙',
    description: 'Итоги, уроки и благодарность',
    title: 'Рефлексия дня',
    content: `<p><strong>Лучшее за сегодня:</strong></p><p><br></p><p><strong>Что было сложным:</strong></p><p><br></p><p><strong>Чему я научился:</strong></p><p><br></p><p><strong>Благодарен за:</strong></p><p>1. </p><p>2. </p><p>3. </p>`,
  },
  {
    id: 'goals',
    name: 'Цели недели',
    emoji: '🎯',
    description: 'Приоритеты, задачи и намерения',
    title: 'Цели на неделю',
    content: `<p><strong>Главная цель недели:</strong></p><p><br></p><p><strong>3 важных задачи:</strong></p><p>1. </p><p>2. </p><p>3. </p><p><br></p><p><strong>Что я готов отпустить:</strong></p><p><br></p><p><strong>Моё намерение на эту неделю:</strong></p><p><br></p>`,
  },
  {
    id: 'gratitude',
    name: 'Список благодарности',
    emoji: '🙏',
    description: '5 вещей, за которые ты благодарен',
    title: 'Благодарность',
    content: `<p>Сегодня я благодарен за:</p><p><br></p><p>1. </p><p>2. </p><p>3. </p><p>4. </p><p>5. </p><p><br></p><p>Один человек, которому я хочу сказать спасибо:</p><p><br></p>`,
  },
  {
    id: 'decision',
    name: 'Анализ решения',
    emoji: '⚖️',
    description: 'Структурируй мысли перед важным выбором',
    title: 'Решение',
    content: `<p><strong>Ситуация:</strong></p><p><br></p><p><strong>Варианты:</strong></p><p>А) </p><p>Б) </p><p><br></p><p><strong>Плюсы варианта А:</strong></p><p><br></p><p><strong>Минусы варианта А:</strong></p><p><br></p><p><strong>Что подсказывает интуиция:</strong></p><p><br></p><p><strong>Моё решение:</strong></p><p><br></p>`,
  },
  {
    id: 'letter',
    name: 'Письмо себе',
    emoji: '💌',
    description: 'Напиши себе в будущем или прошлом',
    title: 'Письмо себе',
    content: `<p>Дорогой я,</p><p><br></p><p>Сейчас я хочу сказать тебе кое-что важное...</p><p><br></p><p><br></p><p><br></p><p>С любовью,<br>Я сегодняшний</p>`,
  },
  {
    id: 'review',
    name: 'Обзор месяца',
    emoji: '📊',
    description: 'Итоги, достижения и план на следующий',
    title: 'Обзор месяца',
    content: `<p><strong>Главные события месяца:</strong></p><p><br></p><p><strong>Чего я достиг:</strong></p><p><br></p><p><strong>Что не получилось и почему:</strong></p><p><br></p><p><strong>Главный урок:</strong></p><p><br></p><p><strong>Слово следующего месяца:</strong></p><p><br></p>`,
  },
]
