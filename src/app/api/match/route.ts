import { NextRequest, NextResponse, after } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { prisma } from "@/lib/prisma/client"
import { authOptions } from "@/lib/auth/config"
import { calculateBarycenter } from "@/lib/overpass/barycenter"
import { searchVenuesNearPoint } from "@/lib/overpass/client"
import { rankVenues } from "@/lib/matching/score"
import { matchVenuesWithGemini } from "@/lib/gemini/matching"
import { matchVenuesWithOllama } from "@/lib/ollama/matching"
import { resolveModel } from "@/lib/llm/models"
import { broadcast } from "@/lib/sse/broadcaster"
import type { UserPreferenceInput, VenueType, ScoredVenue } from "@/types"

const matchSchema = z.object({
  groupId: z.string().min(1),
  model: z.string().optional(),
})
const SEARCH_RADIUS_METERS = 800

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = matchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "groupId required" }, { status: 400 })
  }

  const { groupId, model } = parsed.data

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { preferences: true, members: true },
  })

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }

  const preferences = group.preferences as unknown as UserPreferenceInput[]
  if (preferences.length === 0) {
    return NextResponse.json({ error: "No preferences collected yet" }, { status: 400 })
  }

  // On crée la session puis on rend la main IMMÉDIATEMENT.
  // Le matching tourne en arrière-plan et pousse le résultat via SSE.
  const dbSession = await prisma.session.create({
    data: { groupId, status: "MATCHING" },
  })

  after(() => runMatching(dbSession.id, preferences, model))

  return NextResponse.json({ sessionId: dbSession.id, status: "MATCHING" })
}

async function runMatching(
  sessionId: string,
  preferences: UserPreferenceInput[],
  modelId?: string
) {
  try {
    const barycenter = calculateBarycenter(preferences)
    const allVenueTypes = [...new Set(preferences.flatMap((p) => p.venueTypes))] as VenueType[]

    const venues = await searchVenuesNearPoint(
      barycenter.latitude,
      barycenter.longitude,
      SEARCH_RADIUS_METERS,
      allVenueTypes
    )

    // Pré-sélection déterministe : short-list de candidats (sert aussi de secours).
    const shortlist = rankVenues(barycenter, preferences, venues, 10)
    let finalRecs = shortlist.slice(0, 3)

    // C'est l'IA (Gemini cloud OU modèle local Ollama) qui CHOISIT et classe le
    // top 3 parmi la short-list. Bornée par un timeout : au-delà (ou en cas
    // d'échec), on retombe en silence sur la pré-sélection déterministe pour ne
    // jamais bloquer l'utilisateur. Le local a un budget de temps plus large
    // (chargement du modèle au 1er appel).
    const llm = resolveModel(modelId)
    if (shortlist.length > 1) {
      const curate =
        llm.provider === "ollama"
          ? matchVenuesWithOllama(preferences, shortlist, llm.ollamaModel!)
          : matchVenuesWithGemini(preferences, shortlist)
      const timeoutMs = llm.provider === "ollama" ? 30_000 : 12_000
      const curated = await withTimeout(curate.catch(() => null), timeoutMs)
      if (curated && curated.length > 0) finalRecs = curated
    }

    await persist(sessionId, finalRecs)
    await prisma.session.update({ where: { id: sessionId }, data: { status: "VOTING" } })
    broadcast(sessionId, { type: "ready" })
  } catch (err) {
    console.error("[match] échec du matching:", err)
    // On sort quand même la session de l'état MATCHING pour ne pas bloquer l'UI.
    await prisma.session.update({ where: { id: sessionId }, data: { status: "VOTING" } }).catch(() => {})
    broadcast(sessionId, { type: "ready" })
  }
}

async function persist(sessionId: string, venues: ScoredVenue[]) {
  if (venues.length === 0) return
  await prisma.recommendation.createMany({
    data: venues.map((v) => ({
      sessionId,
      osmId: v.osmId,
      name: v.name,
      address: v.address,
      latitude: v.latitude,
      longitude: v.longitude,
      venueType: v.venueType,
      score: v.score,
      details: { summary: v.summary, compatibilityReasons: v.compatibilityReasons, tags: v.tags },
    })),
  })
}

// Borne le temps d'attente de l'IA : résout null si le délai est dépassé.
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))])
}
