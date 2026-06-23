import type { Barycenter, OsmVenue, ScoredVenue, UserPreferenceInput } from "@/types"

// Les valeurs OSM (amenity/leisure) ne correspondent pas toujours aux clés de l'app.
const OSM_TO_KEY: Record<string, string> = {
  restaurant: "restaurant",
  bar: "bar",
  cafe: "cafe",
  nightclub: "nightclub",
  cinema: "cinema",
  bowling_alley: "bowling",
  amusement_arcade: "escape_game",
}
const TYPE_LABEL: Record<string, string> = {
  restaurant: "Restaurant",
  bar: "Bar",
  cafe: "Café",
  nightclub: "Boîte de nuit",
  cinema: "Cinéma",
  bowling: "Bowling",
  escape_game: "Escape game",
}
const DIET_TAG: Record<string, string> = {
  vegetarian: "vegetarian",
  vegan: "vegan",
  halal: "halal",
  kosher: "kosher",
  "gluten-free": "gluten_free",
}
const DIET_LABEL: Record<string, string> = {
  vegetarian: "Végétarien",
  vegan: "Vegan",
  halal: "Halal",
  kosher: "Casher",
  "gluten-free": "Sans gluten",
}

function haversineMeters(a: Barycenter, b: { latitude: number; longitude: number }): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Classement déterministe (sans IA) : type de lieu voulu par le groupe,
 * compatibilité régime (tags OSM), proximité du barycentre. Instantané et fiable.
 */
export function rankVenues(
  barycenter: Barycenter,
  preferences: UserPreferenceInput[],
  venues: OsmVenue[],
  limit = 3
): ScoredVenue[] {
  if (venues.length === 0) return []

  const typeVotes: Record<string, number> = {}
  for (const p of preferences) for (const t of p.venueTypes) typeVotes[t] = (typeVotes[t] ?? 0) + 1

  const diets = [
    ...new Set(preferences.flatMap((p) => p.dietaryRestrictions).filter((d) => d && d !== "none")),
  ]
  const MAX_DIST = 1200

  const scored = venues.map((v) => {
    const key = OSM_TO_KEY[v.venueType] ?? v.venueType
    const reasons: string[] = []
    let score = 0.45

    const votes = typeVotes[key] ?? 0
    if (votes > 0) {
      score += 0.3 * (votes / preferences.length)
      reasons.push(`${TYPE_LABEL[key] ?? key} recherché`)
    }

    for (const diet of diets) {
      const tag = `diet:${DIET_TAG[diet] ?? diet}`
      const ok =
        v.tags[tag] === "yes" ||
        v.tags[tag] === "only" ||
        (v.tags.cuisine ?? "").includes(DIET_TAG[diet] ?? diet)
      if (ok) {
        score += 0.12
        reasons.push(`${DIET_LABEL[diet] ?? diet} ✓`)
      }
    }

    const dist = haversineMeters(barycenter, v)
    score += 0.25 * Math.max(0, 1 - dist / MAX_DIST)
    reasons.push(`À ${dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(1)} km`} du centre du groupe`)

    if (v.tags.cuisine) reasons.push(`Cuisine : ${v.tags.cuisine.split(";")[0].replace(/_/g, " ")}`)

    return {
      ...v,
      score: Math.min(1, Math.round(score * 100) / 100),
      compatibilityReasons: reasons.slice(0, 3),
    }
  })

  return scored.sort((a, b) => b.score - a.score).slice(0, limit)
}
