"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "@/components/ui/icons"
import { LLM_MODELS, DEFAULT_MODEL_ID, resolveModel } from "@/lib/llm/models"

export function MatchButton({ groupId, memberCount }: { groupId: string; memberCount: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [model, setModel] = useState(DEFAULT_MODEL_ID)
  const [voteThreshold, setVoteThreshold] = useState(memberCount)

  async function handleMatch() {
    setLoading(true)
    setError("")

    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, model, voteThreshold }),
    })

    setLoading(false)

    if (!res.ok) {
      setError("Erreur lors du matching. Réessaie dans un instant.")
      return
    }

    const { sessionId } = await res.json()
    router.push(`/sessions/${sessionId}`)
  }

  const hint = resolveModel(model).hint

  return (
    <div className="space-y-3">
      <label className="block text-left">
        <span className="text-xs font-medium text-faint">Modèle IA</span>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={loading}
          className="input w-full mt-1"
        >
          {LLM_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        {hint && <span className="block text-xs text-faint mt-1">{hint}</span>}
      </label>

      <label className="block text-left">
        <span className="text-xs font-medium text-faint">Nombre de votes pour valider</span>
        <input
          type="number"
          min={1}
          max={memberCount}
          value={voteThreshold}
          onChange={(e) => {
            const value = Number(e.target.value)
            setVoteThreshold(Math.min(memberCount, Math.max(1, value || 1)))
          }}
          disabled={loading}
          className="input w-full mt-1"
        />
        <span className="block text-xs text-faint mt-1">Sur {memberCount} membre{memberCount > 1 ? "s" : ""}. Le vote se clôt dès ce seuil atteint.</span>
      </label>

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
