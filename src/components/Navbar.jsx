import React from 'react'
import { Link } from 'react-router-dom'
import useDarkMode from '../hooks/useDarkMode'

export default function Navbar({ onToggleLeft, onToggleRight, onOpenPlants }) {
  const { isDark, toggle } = useDarkMode()

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-3 py-3 flex items-center gap-3">
        <button onClick={onToggleLeft} className="md:hidden p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Toggle left panel">☰</button>
        <div className="flex items-center gap-2">
          <span className="text-eco-green text-2xl">🌿</span>
          <h1 className="text-xl font-semibold tracking-tight">EcoMapper</h1>
        </div>

        <nav className="hidden md:flex mx-auto items-center gap-6 text-sm">
          <Link to="/" className="text-zinc-600 dark:text-zinc-300 hover:text-eco-green px-3 py-2 rounded-md">Home</Link>
          <Link to="/datasets" className="text-zinc-600 dark:text-zinc-300 hover:text-eco-green px-3 py-2 rounded-md">Datasets</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link to="/plants" className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-md bg-eco-green/10 text-eco-green hover:bg-eco-green/20" aria-label="Open plant selector">Plants</Link>
          <button onClick={onToggleRight} className="md:hidden p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Toggle right panel">ℹ️</button>
          <button onClick={toggle} className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Toggle dark mode">
            {isDark ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </header>
  )
}
