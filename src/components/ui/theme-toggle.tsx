"use client"

import { useEffect, useState } from "react"
import { Sun, Moon } from "@/components/ui/icons"

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"))
    setMounted(true)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    try { localStorage.setItem("theme", next ? "dark" : "light") } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label="Basculer le thème clair / sombre"
      title="Thème clair / sombre"
      className={`btn btn-ghost px-2 ${className}`}
    >
      {/* évite le flash de la mauvaise icône avant hydratation */}
      <span className={mounted ? "" : "opacity-0"}>
        {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </span>
    </button>
  )
}
