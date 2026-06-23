"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "@/components/ui/icons"

export default function JoinGroupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: form.get("inviteCode") }),
    })

    setLoading(false)

    if (res.status === 404) { setError("Code d'invitation invalide"); return }
    if (res.status === 409) { setError("Tu es déjà membre de ce groupe"); return }
    if (!res.ok) { setError("Une erreur est survenue"); return }

    const { group } = await res.json()
    router.push(`/groups/${group.id}`)
  }

  return (
    <div className="max-w-md mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg transition-colors">
        <ArrowLeft className="w-4 h-4" /> Mes groupes
      </Link>

      <h1 className="text-2xl font-semibold text-fg mt-4 mb-1">Rejoindre un groupe</h1>
      <p className="text-sm text-muted mb-6">Colle le code d&apos;invitation que tu as reçu.</p>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Code d&apos;invitation</label>
            <input name="inviteCode" type="text" required autoFocus className="input font-mono" placeholder="abc123…" />
          </div>

          {error && <p className="text-sm alert-error rounded-xl px-3 py-2.5">{error}</p>}

          <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
            {loading ? "Connexion…" : "Rejoindre"}
          </button>
        </form>
      </div>
    </div>
  )
}
