// Registre des modèles de matching, partagé entre l'API (choix du provider)
// et l'UI (sélecteur). Ne contient que des données — importable côté client.

export type LlmProvider = "gemini" | "ollama"

export interface LlmModel {
  id: string // valeur envoyée à /api/match
  label: string // affiché dans le sélecteur
  provider: LlmProvider
  ollamaModel?: string // tag Ollama si provider === "ollama"
  hint?: string
}

export const LLM_MODELS: LlmModel[] = [
  {
    id: "gemini",
    label: "Gemini 2.5 Flash · cloud",
    provider: "gemini",
    hint: "Rapide, nécessite une clé API",
  },
  {
    id: "qwen2.5:3b",
    label: "Qwen 2.5 3B · local",
    provider: "ollama",
    ollamaModel: "qwen2.5:3b",
    hint: "Tourne sur ta machine, privé",
  },
  {
    id: "llama3.2:3b",
    label: "Llama 3.2 3B · local",
    provider: "ollama",
    ollamaModel: "llama3.2:3b",
    hint: "Tourne sur ta machine, privé",
  },
]

export const DEFAULT_MODEL_ID = "gemini"

export function resolveModel(id: string | undefined): LlmModel {
  return (
    LLM_MODELS.find((m) => m.id === id) ??
    LLM_MODELS.find((m) => m.id === DEFAULT_MODEL_ID)!
  )
}
