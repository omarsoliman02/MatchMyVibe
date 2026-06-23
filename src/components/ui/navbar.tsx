"use client"

import { signOut } from "next-auth/react"
import { Logo } from "@/components/ui/logo"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export function Navbar({ userName }: { userName: string }) {
  const initial = userName.charAt(0).toUpperCase()

  return (
    <nav className="sticky top-0 z-20 border-b border-line/80 bg-surface/75 backdrop-blur-md">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        <Logo href="/dashboard" />

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-muted">{userName}</span>
            <span className="w-8 h-8 rounded-full bg-accent-soft text-accent-strong border border-accent-soft flex items-center justify-center text-xs font-semibold">
              {initial}
            </span>
          </div>
          <ThemeToggle />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn btn-ghost px-3 py-2"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  )
}
