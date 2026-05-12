import { useEffect, useState } from 'react'

interface WeatherData {
  temp: number
  condition: string
  emoji: string
}

const WMO_CODES: Record<number, { condition: string; emoji: string }> = {
  0:  { condition: 'Ясно',          emoji: '☀️' },
  1:  { condition: 'Преимущ. ясно', emoji: '🌤️' },
  2:  { condition: 'Переменная',    emoji: '⛅' },
  3:  { condition: 'Облачно',       emoji: '☁️' },
  45: { condition: 'Туман',         emoji: '🌫️' },
  48: { condition: 'Туман',         emoji: '🌫️' },
  51: { condition: 'Морось',        emoji: '🌦️' },
  53: { condition: 'Морось',        emoji: '🌦️' },
  61: { condition: 'Дождь',         emoji: '🌧️' },
  63: { condition: 'Дождь',         emoji: '🌧️' },
  65: { condition: 'Ливень',        emoji: '⛈️' },
  71: { condition: 'Снег',          emoji: '🌨️' },
  73: { condition: 'Снег',          emoji: '❄️' },
  80: { condition: 'Ливень',        emoji: '🌧️' },
  85: { condition: 'Метель',        emoji: '🌨️' },
  95: { condition: 'Гроза',         emoji: '⛈️' },
}

function getWeatherInfo(code: number) {
  return WMO_CODES[code] ?? { condition: 'Ясно', emoji: '🌡️' }
}

const CACHE_KEY = 'dnevchik_weather_cache'
const CACHE_TTL = 30 * 60 * 1000 // 30 min

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY)
      if (!raw) return null
      const { data, ts } = JSON.parse(raw)
      if (Date.now() - ts < CACHE_TTL) return data
    } catch { /* ignore */ }
    return null
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (weather) return
    if (!navigator.geolocation) return
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius`
          const res = await fetch(url)
          const json = await res.json()
          const cw = json.current_weather
          const info = getWeatherInfo(cw.weathercode)
          const data: WeatherData = { temp: Math.round(cw.temperature), ...info }
          setWeather(data)
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
        } catch { /* offline or API error */ } finally {
          setLoading(false)
        }
      },
      () => setLoading(false),
      { timeout: 5000 }
    )
  }, [])

  return { weather, loading }
}
