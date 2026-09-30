'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('preferred_theme')
    const initial = saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    document.documentElement.dataset.theme = initial
    setDark(initial === 'dark')
  }, [])

  function toggleTheme() {
    const next = dark ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    localStorage.setItem('preferred_theme', next)
    setDark(next === 'dark')
  }

  return (
    <button type="button" onClick={toggleTheme} aria-label={dark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'} className="theme-toggle">
      {dark ? '☀️' : '🌙'}
    </button>
  )
}