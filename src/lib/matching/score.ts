import type { Barycenter, OsmVenue, ScoredVenue, UserPreferenceInput } from "@/types"
import { isOpenNow } from "./opening-hours"

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

// OSM ne donne quasiment jamais de vrai prix pour restaurants/bars/etc. (pas de
// price_level fiable). On se limite aux tags "fee"/"charge", qui existent surtout
// sur les lieux à entrée payante (cinéma, bowling, escape game) : fee=no -> gratuit,
// charge="<montant>" -> on extrait le(s) nombre(s) et on prend leur moyenne.
// Si ni l'un ni l'autre n'est présent, on n'a aucun signal fiable : on reste neutre
// (pas de bonus, pas de malus) plutôt que de deviner.
function estimateVenuePrice(tags: Record<string, string>): number | null {
  if (tags.fee === "no") return 0
  if (tags.charge) {
    const numbers = tags.charge.match(/\d+(?:[.,]\d+)?/g)
    if (numbers) {
      const values = numbers.map((n) => parseFloat(n.replace(",", ".")))
      return values.reduce((a, b) => a + b, 0) / values.length
    }
  }
  return null
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
 * Classement déterministe (sans IA), instantané et fiable. Score construit
 * ainsi (chaque composante s'additionne, puis le total est borné à [0, 1]) :
 *
 * - Base fixe : 0.40 — tout lieu renvoyé par la recherche géographique part
 *   avec un socle, puisqu'il correspond déjà à un type demandé par la requête.
 * - Type de lieu recherché : +0.30 * (votes pour ce type / nb de membres) —
 *   plus le groupe est unanime sur le type de sortie, plus le bonus est fort.
 * - Régime alimentaire : +0.12 par régime du groupe repéré dans les tags OSM
 *   (`diet:vegetarian=yes`, etc., ou mot-clé dans `cuisine`). Peut s'additionner
 *   sur plusieurs régimes différents demandés par le groupe.
 * - Budget : +0.15 si un prix est estimable (tags OSM `fee`/`charge`, voir
 *   estimateVenuePrice) ET que ce prix estimé est <= budget moyen du groupe.
 *   Limite connue : OSM ne fournit quasiment jamais de prix fiable pour les
 *   restaurants/bars/cafés — ce bonus ne s'applique donc en pratique qu'à une
 *   minorité de lieux (cinéma, bowling, escape game...). Sans tag exploitable,
 *   le score reste neutre plutôt que de deviner.
 * - Proximité du barycentre : +0.25 * max(0, 1 - distance / 1200 m) — dégressif
 *   jusqu'à 1,2 km, au-delà le bonus est nul.
 *
 * Le total est arrondi à 2 décimales puis plafonné à 1 (Math.min) : cumuler
 * plusieurs régimes ou tous les bonus à la fois peut dépasser 1 avant ce
 * plafond, ce qui est voulu (un lieu "parfait" sur tous les critères reste à 1).
 *
 * - Horaires d'ouverture : -0.2 si le lieu est détecté comme fermé à l'instant
 *   présent (tag OSM `opening_hours`, voir isOpenNow). Une pénalité légère, pas
 *   une exclusion : un lieu fermé peut rester pertinent (rouvre bientôt, horaires
 *   mal renseignés...). Il n'est retiré complètement du résultat que si le
 *   groupe a largement assez d'alternatives déjà ouvertes (voir fin de
 *   fonction). Si le statut est inconnu (tag absent/ambigu), aucun impact.
 *
 * Limite assumée : `movieGenres` (préférence de genre de film) n'intervient PAS
 * dans ce score. Overpass/OSM ne fournit ni programmation ni séances réelles
 * pour les cinémas, donc on ne peut pas vérifier si un lieu projette vraiment
 * un film du genre demandé — ajouter un bonus reviendrait à deviner. Ce critère
 * n'est utilisé que côté prompt IA (buildMatchingPrompt), à titre indicatif et
 * avec une réserve explicite dans le résumé généré.
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
  const CLOSED_PENALTY = 0.2
  const avgBudget = preferences.reduce((sum, p) => sum + p.budget, 0) / preferences.length
  const now = new Date()

  const scored = venues.map((v) => {
    const key = OSM_TO_KEY[v.venueType] ?? v.venueType
    const reasons: string[] = []
    let score = 0.4

    const votes = typeVotes[key] ?? 0
    if (votes > 0) {
      score += 0.3 * (votes / preferences.length)
      reasons.push(`${TYPE_LABEL[key] ?? key} recherché`)
    }

    const openStatus = isOpenNow(v.tags.opening_hours, now)
    if (openStatus.isOpen === false) {
      score -= CLOSED_PENALTY
      reasons.push("Fermé actuellement")
    } else if (openStatus.isOpen === true) {
      reasons.push("Ouvert maintenant")
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

    const estimatedPrice = estimateVenuePrice(v.tags)
    if (estimatedPrice !== null && estimatedPrice <= avgBudget) {
      score += 0.15
      reasons.push(estimatedPrice === 0 ? "Gratuit ✓" : `Budget respecté (~${estimatedPrice}€) ✓`)
    }

    const dist = haversineMeters(barycenter, v)
    score += 0.25 * Math.max(0, 1 - dist / MAX_DIST)
    reasons.push(`À ${dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(1)} km`} du centre du groupe`)

    const cuisine = v.tags.cuisine ? v.tags.cuisine.split(";")[0].replace(/_/g, " ") : null
    if (cuisine) reasons.push(`Cuisine : ${cuisine}`)

    // Résumé déterministe (secours si l'IA ne fournit pas de "summary").
    const distLabel = dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(1)} km`
    const summary = `${TYPE_LABEL[key] ?? key}${cuisine ? ` ${cuisine}` : ""} à ${distLabel} du groupe.`

    return {
      ...v,
      score: Math.min(1, Math.round(score * 100) / 100),
      summary,
      compatibilityReasons: reasons.slice(0, 3),
    }
  })

  // On ne retire les lieux fermés que si le groupe a déjà largement assez
  // d'alternatives ouvertes (ou au statut inconnu) pour remplir `limit` ; sinon
  // on les garde (pénalisés) plutôt que de risquer une liste vide/trop courte.
  const openOrUnknown = scored.filter((v) => isOpenNow(v.tags.opening_hours, now).isOpen !== false)
  const pool = openOrUnknown.length >= limit ? openOrUnknown : scored

  return pool.sort((a, b) => b.score - a.score).slice(0, limit)
}
