"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MapPin, Wallet, Salad, Check } from "@/components/ui/icons"

const DIETARY_OPTIONS = [
  { value: "none", label: "Aucune restriction" },
  { value: "vegetarian", label: "Végétarien" },
  { value: "vegan", label: "Vegan" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Casher" },
  { value: "gluten-free", label: "Sans gluten" },
]

const VENUE_OPTIONS = [
  { value: "restaurant", label: "🍽️ Restaurant" },
  { value: "bar", label: "🍸 Bar" },
  { value: "cafe", label: "☕ Café" },
  { value: "nightclub", label: "🎵 Boîte de nuit" },
  { value: "cinema", label: "🎬 Cinéma" },
  { value: "bowling", label: "🎳 Bowling" },
  { value: "escape_game", label: "🔐 Escape game" },
]

function SectionHeader({ icon, title, trailing }: { icon: React.ReactNode; title: string; trailing?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center">{icon}</span>
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
      </div>
      {trailing}
    </div>
  )
}

export default function PreferencesPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState("")
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  const [budget, setBudget] = useState(30)
  const [dietary, setDietary] = useState<string[]>([])
  const [venueTypes, setVenueTypes] = useState<string[]>(["restaurant"])

  function getLocation() {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        setError("Impossible d'obtenir ta localisation. Autorise l'accès dans ton navigateur.")
        setLocating(false)
      }
    )
  }

  useEffect(() => { getLocation() }, [])

  function toggleDietary(value: string) {
    setDietary((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  function toggleVenue(value: string) {
    setVenueTypes((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!location) { setError("Localisation requise"); return }
    if (venueTypes.length === 0) { setError("Choisis au moins un type de lieu"); return }

    setLoading(true)
    setError("")

    const res = await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId,
        budget,
        dietaryRestrictions: dietary.filter((d) => d !== "none"),
        venueTypes,
        latitude: location.lat,
        longitude: location.lng,
      }),
    })

    setLoading(false)

    if (!res.ok) { setError("Erreur lors de la sauvegarde"); return }

    router.push(`/groups/${groupId}`)
  }

  return (
    <div className="max-w-md mx-auto">
      <Link href={`/groups/${groupId}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour au groupe
      </Link>

      <h1 className="text-2xl font-semibold text-fg mt-4 mb-1">Mes préférences</h1>
      <p className="text-sm text-muted mb-6">L&apos;IA combine les préférences de tout le groupe pour trouver le lieu idéal.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card p-5">
          <SectionHeader icon={<MapPin className="w-4 h-4" />} title="Ma localisation" />
          {location ? (
            <div className="flex items-center gap-2 text-sm alert-ok rounded-xl px-3 py-2.5">
              <Check className="w-4 h-4" />
              Position obtenue ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
            </div>
          ) : (
            <button type="button" onClick={getLocation} disabled={locating} className="btn btn-secondary w-full">
              {locating ? "Localisation en cours…" : "Partager ma position"}
            </button>
          )}
        </div>

        <div className="card p-5">
          <SectionHeader
            icon={<Wallet className="w-4 h-4" />}
            title="Budget maximum"
            trailing={<span className="text-base font-semibold text-accent">{budget}€</span>}
          />
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-faint mt-2">
            <span>5€</span><span>100€</span>
          </div>
        </div>

        <div className="card p-5">
          <SectionHeader icon={<Salad className="w-4 h-4" />} title="Régime alimentaire" />
          <div className="grid grid-cols-2 gap-2">
            {DIETARY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleDietary(opt.value)}
                className={`chip ${dietary.includes(opt.value) ? "chip-active" : ""}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <SectionHeader icon={<MapPin className="w-4 h-4" />} title="Type de lieu" />
          <div className="grid grid-cols-2 gap-2">
            {VENUE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleVenue(opt.value)}
                className={`chip ${venueTypes.includes(opt.value) ? "chip-active" : ""}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm alert-error rounded-xl px-3 py-2.5 text-center">{error}</p>}

        <button type="submit" disabled={loading || !location} className="btn btn-primary btn-lg w-full">
          {loading ? "Sauvegarde…" : "Valider mes préférences"}
        </button>
      </form>
    </div>
  )
}
