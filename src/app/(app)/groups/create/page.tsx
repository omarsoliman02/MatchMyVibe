"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "@/components/ui/icons"

export default function CreateGroupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name") }),
    })

    setLoading(false)

    if (!res.ok) {
      setError("Impossible de créer le groupe")
      return
    }

    const { group } = await res.json()
    router.push(`/groups/${group.id}`)
  }

  return (
    <div className="max-w-md mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg transition-colors">
        <ArrowLeft className="w-4 h-4" /> Mes groupes
      </Link>

      <h1 className="text-2xl font-semibold text-fg mt-4 mb-1">Nouveau groupe</h1>
      <p className="text-sm text-muted mb-6">Donne-lui un nom — tu inviteras les autres juste après.</p>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nom du groupe</label>
            <input name="name" type="text" required autoFocus className="input" placeholder="Les copains du jeudi" />
          </div>

          {error && <p className="text-sm alert-error rounded-xl px-3 py-2.5">{error}</p>}

          <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
            {loading ? "Création…" : "Créer le groupe"}
          </button>
        </form>
      </div>
    </div>
  )
}
