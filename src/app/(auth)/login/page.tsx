"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError("Email ou mot de passe incorrect")
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <div className="card p-7">
      <h2 className="text-lg font-semibold text-fg">Connexion</h2>
      <p className="text-sm text-muted mt-1 mb-6">Content de te revoir 👋</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" required className="input" placeholder="toi@email.com" />
        </div>

        <div>
          <label className="label">Mot de passe</label>
          <input name="password" type="password" required className="input" placeholder="••••••••" />
        </div>

        {error && (
          <p className="text-sm alert-error rounded-xl px-3 py-2.5">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        Pas encore de compte ?{" "}
        <Link href="/register" className="text-accent font-medium hover:text-accent-strong">
          S&apos;inscrire
        </Link>
      </p>
    </div>
  )
}
