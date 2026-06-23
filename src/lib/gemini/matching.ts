import { GoogleGenerativeAI } from "@google/generative-ai"
import type { OsmVenue, ScoredVenue, UserPreferenceInput } from "@/types"
import { buildMatchingPrompt, parseRecommendations } from "@/lib/llm/shared"

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null

// flash-lite en priorité : ~0,9 s (vs ~6,5 s pour flash-latest qui "réfléchit").
// flash-latest en secours (plus soigné si besoin).
const GEMINI_MODELS = ["gemini-2.5-flash-lite", "gemini-flash-latest", "gemini-2.5-flash"]

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

  const text = await generateWithFallback(buildMatchingPrompt(preferences, venues))
  return parseRecommendations(text, venues)
}
