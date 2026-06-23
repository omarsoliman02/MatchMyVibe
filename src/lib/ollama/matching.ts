import type { OsmVenue, ScoredVenue, UserPreferenceInput } from "@/types"
import { buildMatchingPrompt, parseRecommendations } from "@/lib/llm/shared"

// En local (npm run dev) → localhost. En Docker → host.docker.internal
// (défini via OLLAMA_BASE_URL dans docker-compose.yml).
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434"

/**
 * Cure une short-list de lieux avec un modèle local via Ollama. Prompt raccourci
 * (moins de lieux) et `format: json` pour une sortie fiable et rapide. Renvoie []
 * si Ollama échoue (l'appelant garde alors le classement déterministe).
 */
export async function matchVenuesWithOllama(
  preferences: UserPreferenceInput[],
  venues: OsmVenue[],
  model: string
): Promise<ScoredVenue[]> {
  if (venues.length === 0) return []

  // Prompt raccourci pour le local : 8 lieux suffisent et accélèrent la réponse.
  const prompt = buildMatchingPrompt(preferences, venues, 8)

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      format: "json", // force une sortie JSON valide
      stream: false,
      keep_alive: "10m", // garde le modèle chargé en RAM entre deux matchings
      options: {
        temperature: 0.3,
        num_predict: 512, // sortie courte (top 3 + raisons)
        num_ctx: 4096,
      },
    }),
  })

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status} ${await res.text().catch(() => "")}`)
  }

  const data = (await res.json()) as { message?: { content?: string } }
  return parseRecommendations(data.message?.content ?? "", venues)
}
