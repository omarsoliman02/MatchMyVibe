"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Trophy, Sparkles, MapPin } from "@/components/ui/icons"

interface Recommendation {
  id: string
  name: string
  address: string
  score: number
  venueType: string
  latitude: number
  longitude: number
  details: { compatibilityReasons?: string[]; summary?: string }
  voteCount: number
}

// Lien Google Maps vers le lieu : par nom + adresse si dispo, sinon par coordonnées.
function mapsUrl(rec: Recommendation): string {
  const hasAddress = rec.address && rec.address !== "Adresse non disponible"
  const query = hasAddress ? `${rec.name}, ${rec.address}` : `${rec.latitude},${rec.longitude}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

interface SessionData {
  id: string
  status: string
  groupId: string
  recommendations: Recommendation[]
  userVote: string | null
  totalMembers: number
}

const MATCHING_MESSAGES = [
  "On lit les préférences de chacun…",
  "Repérage des spots autour de vous 📍",
  "On vérifie les budgets et les régimes 🥗",
  "L'IA compare les meilleures options ✨",
  "Classement des coups de cœur…",
  "Presque prêt 🎉",
]

function MatchingLoader() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % MATCHING_MESSAGES.length), 2200)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="card p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-accent-soft text-accent flex items-center justify-center mx-auto mb-4 pulse-soft">
        <Sparkles className="w-7 h-7" />
      </div>
      <p key={i} className="font-medium text-fg reveal">{MATCHING_MESSAGES[i]}</p>
      <p className="text-sm text-muted mt-1">Gemini compose vos recommandations…</p>
      <div className="loader-bar max-w-xs mx-auto mt-5" />
    </div>
  )
}

function SkeletonCards() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card p-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-subtle animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded bg-subtle animate-pulse" />
              <div className="h-3 w-56 rounded bg-subtle animate-pulse" />
            </div>
            <div className="h-6 w-12 rounded bg-subtle animate-pulse" />
          </div>
          <div className="h-1.5 w-full rounded-full bg-subtle animate-pulse mt-5" />
        </div>
      ))}
    </div>
  )
}

export default function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [error, setError] = useState("")

  const loadSession = useCallback(async () => {
    try {
      const r = await fetch(`/api/sessions/${sessionId}`)
      const data = await r.json()
      setSession(data.session ?? null)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  // Chargement initial
  useEffect(() => { loadSession() }, [loadSession])

  // SSE : "ready" => recharge, "vote" => maj des compteurs en direct
  useEffect(() => {
    if (!sessionId) return
    const es = new EventSource(`/api/sse?sessionId=${sessionId}`)
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === "ready") {
        loadSession()
        return
      }
      setSession((prev) =>
        prev
          ? {
              ...prev,
              recommendations: prev.recommendations.map((rec) =>
                rec.id === msg.recommendationId ? { ...rec, voteCount: msg.voteCount } : rec
              ),
            }
          : prev
      )
    }
    return () => es.close()
  }, [sessionId, loadSession])

  // Filet de sécurité : tant que le matching tourne, on rafraîchit
  useEffect(() => {
    if (session?.status !== "MATCHING") return
    const t = setInterval(loadSession, 2000)
    return () => clearInterval(t)
  }, [session?.status, loadSession])

  async function castVote(recommendationId: string) {
    setVoting(true)
    setError("")
    const res = await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, recommendationId }),
    })
    setVoting(false)
    if (!res.ok) { setError("Impossible de voter"); return }
    setSession((prev) => (prev ? { ...prev, userVote: recommendationId } : prev))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2.5">
          <div className="h-4 w-28 rounded bg-subtle animate-pulse" />
          <div className="h-8 w-56 rounded-lg bg-subtle animate-pulse" />
        </div>
        <SkeletonCards />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="text-center py-24">
        <p className="text-muted">Session introuvable</p>
        <Link href="/dashboard" className="text-accent text-sm font-medium mt-2 inline-block">Retour au tableau de bord</Link>
      </div>
    )
  }

  const BackLink = (
    <Link href={`/groups/${session.groupId}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg transition-colors">
      <ArrowLeft className="w-4 h-4" /> Retour au groupe
    </Link>
  )

  // Matching en cours : page instantanée, résultats poussés via SSE
  if (session.status === "MATCHING") {
    return (
      <div className="space-y-6">
        <div>
          {BackLink}
          <div className="flex items-center justify-between gap-3 mt-3">
            <h1 className="text-2xl font-semibold text-fg">Recommandations</h1>
            <StatusChip status="MATCHING" />
          </div>
        </div>
        <MatchingLoader />
        <SkeletonCards />
      </div>
    )
  }

  const winner = session.status === "DONE"
    ? [...session.recommendations].sort((a, b) => b.voteCount - a.voteCount)[0]
    : null

  return (
    <div className="space-y-6">
      <div>
        {BackLink}
        <div className="flex items-center justify-between gap-3 mt-3">
          <h1 className="text-2xl font-semibold text-fg">Recommandations</h1>
          <StatusChip status={session.status} />
        </div>
        <p className="text-sm text-muted mt-1">
          {`${session.recommendations.length} ${
            session.recommendations.length > 1 ? "lieux sélectionnés" : "lieu sélectionné"
          } pour votre groupe.`}
        </p>
      </div>

      {session.recommendations.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-medium text-fg">Aucun lieu trouvé</p>
          <p className="text-sm text-muted mt-1.5 max-w-sm mx-auto">
            Pas de spot compatible autour du groupe. Élargis les types de lieux et relance le matching.
          </p>
          <Link href={`/groups/${session.groupId}`} className="btn btn-secondary mt-5 inline-flex">
            Retour au groupe
          </Link>
        </div>
      ) : (
        <>
          {winner && (
            <div className="card p-5 border-accent-soft bg-accent-soft">
              <div className="flex items-center gap-2 text-accent mb-2">
                <Trophy className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Choix du groupe</span>
              </div>
              <a
                href={mapsUrl(winner)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl font-bold text-fg hover:text-accent transition-colors inline-flex items-center gap-1.5"
              >
                {winner.name} <MapPin className="w-4 h-4 text-accent" />
              </a>
              <p className="text-sm text-muted mt-1">{winner.address}</p>
            </div>
          )}

          <div className="space-y-3">
            {session.recommendations.map((rec, i) => {
              const isVoted = session.userVote === rec.id
              const votePercent = session.totalMembers > 0
                ? Math.round((rec.voteCount / session.totalMembers) * 100)
                : 0

              return (
                <div
                  key={rec.id}
                  className={`card p-5 transition-all reveal ${isVoted ? "border-accent ring-2 ring-accent-soft" : ""}`}
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-subtle border border-line flex items-center justify-center text-xl shrink-0">
                        {VENUE_EMOJI[rec.venueType] ?? "📍"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-faint">#{i + 1}</span>
                          <a
                            href={mapsUrl(rec)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-fg truncate hover:text-accent transition-colors"
                          >
                            {rec.name}
                          </a>
                        </div>
                        <p className="text-sm text-muted mt-0.5">{rec.address}</p>
                        {rec.details.summary && (
                          <p className="text-sm text-fg/80 mt-1.5">{rec.details.summary}</p>
                        )}
                        <a
                          href={mapsUrl(rec)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-accent mt-1.5 hover:underline"
                        >
                          <MapPin className="w-3 h-3" /> Voir sur Maps
                        </a>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-accent leading-none">{Math.round(rec.score * 100)}%</p>
                      <p className="text-xs text-faint mt-1">compatibilité</p>
                    </div>
                  </div>

                  {rec.details.compatibilityReasons && rec.details.compatibilityReasons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {rec.details.compatibilityReasons.map((r, idx) => (
                        <span key={idx} className="text-xs bg-subtle text-muted px-2 py-1 rounded-full">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="h-1.5 bg-subtle rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${votePercent}%` }} />
                      </div>
                      <p className="text-xs text-faint mt-1.5">
                        {rec.voteCount}/{session.totalMembers} vote{rec.voteCount > 1 ? "s" : ""}
                      </p>
                    </div>

                    {session.status === "VOTING" && (
                      <button
                        onClick={() => castVote(rec.id)}
                        disabled={voting}
                        className={`btn shrink-0 px-4 ${isVoted ? "btn-primary" : "btn-secondary"}`}
                      >
                        {isVoted ? <><Check className="w-4 h-4" /> Voté</> : "Voter"}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {error && <p className="text-sm text-danger text-center">{error}</p>}
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    VOTING: { label: "Vote ouvert", className: "badge-accent" },
    DONE: { label: "Terminé", className: "badge-success" },
    MATCHING: { label: "Matching en cours…", className: "badge-warning" },
  }
  const config = map[status] ?? { label: status, className: "badge-neutral" }
  return <span className={`badge ${config.className}`}>{config.label}</span>
}

const VENUE_EMOJI: Record<string, string> = {
  restaurant: "🍽️",
  bar: "🍸",
  cafe: "☕",
  nightclub: "🎵",
  cinema: "🎬",
  bowling: "🎳",
  escape_game: "🔐",
}
