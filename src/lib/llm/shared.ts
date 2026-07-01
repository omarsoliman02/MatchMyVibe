import type { OsmVenue, ScoredVenue, UserPreferenceInput } from "@/types"

// Projection compacte : seulement ce qui sert au scoring (moins de tokens = plus rapide).
// On n'envoie un régime QUE s'il est réellement supporté (valeur "yes"/"only"),
// pour ne pas faire croire au modèle qu'un lieu marqué diet:vegetarian=no l'est.
export function compactVenues(venues: OsmVenue[], limit = 12) {
  return venues.slice(0, limit).map((v) => ({
    id: v.osmId,
    name: v.name,
    type: v.venueType,
    cuisine: v.tags.cuisine,
    diet: Object.keys(v.tags).filter(
      (k) => k.startsWith("diet:") && ["yes", "only"].includes(v.tags[k])
    ),
  }))
}

// Prompt commun (Gemini + local). `venueLimit` permet de raccourcir l'entrée
// pour les modèles locaux (moins de lieux = réponse plus rapide).
export function buildMatchingPrompt(
  preferences: UserPreferenceInput[],
  venues: OsmVenue[],
  venueLimit = 12
): string {
  const freeTexts = preferences
    .map((p) => p.freeText?.trim())
    .filter((t): t is string => !!t)

  const freeTextSection = freeTexts.length
    ? `\n\nPRÉCISIONS DU GROUPE:\n${JSON.stringify(freeTexts)}\nTiens compte de ces précisions dans le choix des lieux et dans le "summary" généré.`
    : ""

  // On n'a aucune donnée de programmation/séances réelle (Overpass ne fournit pas ça) :
  // le genre est juste une préférence déclarative à mentionner avec la réserve qui va avec.
  const movieGenres = [
    ...new Set(preferences.flatMap((p) => p.movieGenres ?? []).filter((g) => g && g !== "any")),
  ]
  const hasCinemaVenue = venues.some((v) => v.venueType === "cinema")
  const movieGenreSection =
    hasCinemaVenue && movieGenres.length
      ? `\n\nGENRES DE FILM PRÉFÉRÉS DU GROUPE (si un cinéma est recommandé):\n${JSON.stringify(movieGenres)}\nOn n'a pas la programmation réelle des cinémas (aucune donnée de séances). Si tu recommandes un cinéma, précise dans le "summary" que le genre n'est pas garanti faute de données de séances, tout en indiquant que le lieu convient pour une sortie ciné.`
      : ""

  return `Expert en sorties de groupe. Choisis les 3 meilleurs lieux parmi la liste, selon les préférences.

PRÉFÉRENCES (budget, régime, types):
${JSON.stringify(
    preferences.map((p) => ({
      budget: p.budget,
      diet: p.dietaryRestrictions,
      types: p.venueTypes,
    }))
  )}${freeTextSection}${movieGenreSection}

LIEUX:
${JSON.stringify(compactVenues(venues, venueLimit))}

Règles: respecter le régime de TOUS, privilégier le type voulu par la majorité, score 0.0-1.0. "summary" = une phrase courte qui donne envie. Raisons courtes et concrètes, en français.
Réponds UNIQUEMENT ce JSON (sans markdown): {"recommendations":[{"id":"","score":0.0,"summary":"phrase courte","compatibilityReasons":["raison courte"]}]}`
}

interface AIRecommendation {
  id?: string
  osmId?: string
  score?: number
  summary?: string
  compatibilityReasons?: string[]
}
interface AIResponse {
  recommendations?: AIRecommendation[]
}

// Parse la réponse texte d'un LLM (Gemini ou Ollama) en ScoredVenue[].
// Tolère le markdown autour du JSON et borne le score dans [0, 1].
export function parseRecommendations(
  text: string,
  venues: OsmVenue[]
): ScoredVenue[] {
  let parsed: AIResponse
  try {
    parsed = JSON.parse(text)
  } catch {
    const m = text.match(/\{[\s\S]*\}/)
    parsed = m ? (JSON.parse(m[0]) as AIResponse) : {}
  }

  return (parsed.recommendations ?? [])
    .slice(0, 3)
    .map((rec) => {
      const key = String(rec.id ?? rec.osmId ?? "")
      const venue = venues.find((v) => v.osmId === key)
      if (!venue) return null
      const score = Math.max(0, Math.min(1, Number(rec.score) || 0))
      return {
        ...venue,
        score,
        summary: typeof rec.summary === "string" ? rec.summary : undefined,
        compatibilityReasons: rec.compatibilityReasons ?? [],
      }
    })
    .filter(Boolean) as ScoredVenue[]
}
