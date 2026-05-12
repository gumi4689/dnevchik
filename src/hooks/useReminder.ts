import { useEffect } from 'react'

export function useReminder(enabled: boolean, time: string, entries: { createdAt: string }[]) {
  useEffect(() => {
    if (!enabled) return

    async function requestPermission() {
      if (Notification.permission === 'default') {
        await Notification.requestPermission()
      }
    }
    requestPermission()

    function check() {
      if (Notification.permission !== 'granted') return
      const [hh, mm] = time.split(':').map(Number)
      const now = new Date()
      if (now.getHours() !== hh || now.getMinutes() !== mm) return
      const todayStr = now.toISOString().slice(0, 10)
      const hasToday = entries.some(e => e.createdAt.slice(0, 10) === todayStr)
      if (!hasToday) {
        const last = localStorage.getItem('dnevchik_reminder_last')
        if (last === todayStr) return
        localStorage.setItem('dnevchik_reminder_last', todayStr)
        new Notification('Dnevchik', {
          body: 'Ты ещё не написал сегодня. Как прошёл твой день?',
          icon: '/favicon.ico',
        })
      }
    }

    const id = setInterval(check, 60_000)
    check()
    return () => clearInterval(id)
  }, [enabled, time, entries])
}
