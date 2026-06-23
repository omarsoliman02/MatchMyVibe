import { GoogleGenerativeAI } from "@google/generative-ai"
import type { OsmVenue, ScoredVenue, UserPreferenceInput } from "@/types"

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null

// flash-lite en priorité : ~0,9 s (vs ~6,5 s pour flash-latest qui "réfléchit").
// flash-latest en secours (plus soigné si besoin).
const GEMINI_MODELS = ["gemini-2.5-flash-lite", "gemini-flash-latest", "gemini-2.5-flash"]

// Projection compacte : seulement ce qui sert au scoring (moins de tokens = plus rapide).
function compactVenues(venues: OsmVenue[]) {
  return venues.slice(0, 15).map((v) => ({
    osmId: v.osmId,
    name: v.name,
    type: v.venueType,
    cuisine: v.tags.cuisine,
    diet: Object.keys(v.tags).filter((k) => k.startsWith("diet:")),
  }))
}

const MATCHING_PROMPT = (preferences: UserPreferenceInput[], venues: OsmVenue[]) =>
  `Expert en sorties de groupe. Choisis les 3 meilleurs lieux parmi la liste, selon les préférences.

PRÉFÉRENCES (budget, régime, types):
${JSON.stringify(preferences.map((p) => ({ budget: p.budget, diet: p.dietaryRestrictions, types: p.venueTypes })))}

LIEUX:
${JSON.stringify(compactVenues(venues))}

Règles: respecter le régime de TOUS, privilégier le type voulu par la majorité, score 0.0-1.0. Raisons courtes et concrètes, en français.
Réponds UNIQUEMENT ce JSON (sans markdown): {"recommendations":[{"osmId":"","score":0.0,"compatibilityReasons":["raison courte"]}]}`

interface AIRecommendation {
  osmId: string
  score: number
  compatibilityReasons: string[]
}
interface AIResponse {
  recommendations: AIRecommendation[]
}

async function generateWithFallback(prompt: string): Promise<string> {
  if (!genAI) throw new Error("GEMINI_API_KEY manquante")
  let lastErr: unknown
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 2048,
          temperature: 0.4,
        },
      })
      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch (err) {
      lastErr = err // modèle indisponible → on tente le suivant
    }
  }
  throw lastErr ?? new Error("Aucun modèle Gemini disponible")
}

/**
 * Cure une short-list de lieux avec Gemini : choisit et classe le top 3 + rédige
 * les raisons. Renvoie [] si Gemini est indisponible (l'appelant garde alors le
 * classement déterministe).
 */
export async function matchVenuesWithGemini(
  preferences: UserPreferenceInput[],
  venues: OsmVenue[]
): Promise<ScoredVenue[]> {
  if (venues.length === 0 || !genAI) return []

  const text = await generateWithFallback(MATCHING_PROMPT(preferences, venues))

  let parsed: AIResponse
  try {
    parsed = JSON.parse(text)
  } catch {
    const m = text.match(/\{[\s\S]*\}/)
    parsed = m ? JSON.parse(m[0]) : { recommendations: [] }
  }

  return (parsed.recommendations ?? [])
    .slice(0, 3)
    .map((rec) => {
      const venue = venues.find((v) => v.osmId === String(rec.osmId))
      if (!venue) return null
      return { ...venue, score: rec.score, compatibilityReasons: rec.compatibilityReasons ?? [] }
    })
    .filter(Boolean) as ScoredVenue[]
}
