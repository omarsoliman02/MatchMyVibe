"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "@/components/ui/icons"

export function MatchButton({ groupId }: { groupId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleMatch() {
    setLoading(true)
    setError("")

    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
    })

    setLoading(false)

    if (!res.ok) {
      setError("Erreur lors du matching. Réessaie dans un instant.")
      return
    }

    const { sessionId } = await res.json()
    router.push(`/sessions/${sessionId}`)
  }

  return (
    <div className="space-y-2">
      <button onClick={handleMatch} disabled={loading} className="btn btn-primary btn-lg w-full">
        {loading ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            L&apos;IA cherche le lieu parfait…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" /> Lancer le matching IA
          </>
        )}
      </button>
      {error && <p className="text-sm text-danger text-center">{error}</p>}
    </div>
  )
}
