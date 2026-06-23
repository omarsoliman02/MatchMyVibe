"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        name: form.get("name"),
        password: form.get("password"),
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(
        data.error === "Email already in use"
          ? "Cet email est déjà utilisé"
          : "Une erreur est survenue"
      )
      return
    }

    router.push("/login?registered=1")
  }

  return (
    <div className="card p-7">
      <h2 className="text-lg font-semibold text-fg">Créer un compte</h2>
      <p className="text-sm text-muted mt-1 mb-6">Quelques secondes, et c&apos;est parti ✨</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Prénom</label>
          <input name="name" type="text" required className="input" placeholder="Benoit" />
        </div>

        <div>
          <label className="label">Email</label>
          <input name="email" type="email" required className="input" placeholder="toi@email.com" />
        </div>

        <div>
          <label className="label">Mot de passe</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="input"
            placeholder="6 caractères minimum"
          />
        </div>

        {error && (
          <p className="text-sm alert-error rounded-xl px-3 py-2.5">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
          {loading ? "Création…" : "Créer mon compte"}
        </button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        Déjà un compte ?{" "}
        <Link href="/login" className="text-accent font-medium hover:text-accent-strong">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
