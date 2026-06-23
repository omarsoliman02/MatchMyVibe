import { POST } from "@/app/api/match/route"
import { NextRequest } from "next/server"

// La route lance le matching en arrière-plan via `after()` (hors scope de requête
// dans Jest). On capture le callback pour pouvoir le déclencher manuellement, tout
// en gardant NextRequest/NextResponse réels.
const mockAfter: { cb: null | (() => Promise<void> | void) } = { cb: null }
jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server")
  return { ...actual, after: (fn: () => Promise<void> | void) => { mockAfter.cb = fn } }
})
jest.mock("@/lib/sse/broadcaster", () => ({ broadcast: jest.fn() }))

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth/config", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma/client", () => ({
  prisma: {
    group: { findUnique: jest.fn() },
    session: { create: jest.fn(), update: jest.fn() },
    recommendation: { createMany: jest.fn() },
  },
}))
jest.mock("@/lib/overpass/client", () => ({
  searchVenuesNearPoint: jest.fn(),
}))
jest.mock("@/lib/gemini/matching", () => ({
  matchVenuesWithGemini: jest.fn(),
}))

import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma/client"
import { searchVenuesNearPoint } from "@/lib/overpass/client"
import { matchVenuesWithGemini } from "@/lib/gemini/matching"

const mockSession = getServerSession as jest.Mock
const mockGroupFind = prisma.group.findUnique as jest.Mock
const mockSessionCreate = prisma.session.create as jest.Mock
const mockSessionUpdate = prisma.session.update as jest.Mock
const mockRecommendationCreate = prisma.recommendation.createMany as jest.Mock
const mockSearchVenues = searchVenuesNearPoint as jest.Mock
const mockGemini = matchVenuesWithGemini as jest.Mock

const MOCK_GROUP = {
  id: "group-1",
  name: "Les copains",
  members: [
    { userId: "user-1", user: {} },
    { userId: "user-2", user: {} },
  ],
  _count: { members: 2 },
}

const MOCK_PREFERENCES = [
  { budget: 30, dietaryRestrictions: ["vegetarian"], venueTypes: ["restaurant"], latitude: 48.85, longitude: 2.35 },
  { budget: 40, dietaryRestrictions: [], venueTypes: ["restaurant", "bar"], latitude: 48.87, longitude: 2.37 },
]

const MOCK_VENUES = [
  { osmId: "osm-1", name: "Le Petit Zinc", address: "11 rue de Buci", latitude: 48.86, longitude: 2.36, venueType: "restaurant", tags: {} },
]

const MOCK_SCORED = [
  { ...MOCK_VENUES[0], score: 0.92, compatibilityReasons: ["Végétarien", "Dans le budget"] },
]

describe("POST /api/match", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAfter.cb = null
  })

  it("should return 401 when not authenticated", async () => {
    mockSession.mockResolvedValue(null)
    const res = await POST(new NextRequest("http://localhost/api/match", { method: "POST", body: JSON.stringify({ groupId: "group-1" }) }))
    expect(res.status).toBe(401)
  })

  it("should return 404 when group does not exist", async () => {
    mockSession.mockResolvedValue({ user: { id: "user-1" } })
    mockGroupFind.mockResolvedValue(null)

    const res = await POST(new NextRequest("http://localhost/api/match", { method: "POST", body: JSON.stringify({ groupId: "group-1" }) }))
    expect(res.status).toBe(404)
  })

  it("should create a session, return it immediately, then orchestrate matching in the background", async () => {
    mockSession.mockResolvedValue({ user: { id: "user-1" } })
    mockGroupFind.mockResolvedValue({ ...MOCK_GROUP, preferences: MOCK_PREFERENCES })
    mockSessionCreate.mockResolvedValue({ id: "session-1" })
    mockSessionUpdate.mockResolvedValue({})
    mockSearchVenues.mockResolvedValue(MOCK_VENUES)
    mockGemini.mockResolvedValue(MOCK_SCORED)
    mockRecommendationCreate.mockResolvedValue({ count: 1 })

    // 1) Réponse immédiate : la session est créée en état MATCHING.
    const res = await POST(new NextRequest("http://localhost/api/match", { method: "POST", body: JSON.stringify({ groupId: "group-1" }) }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.sessionId).toBe("session-1")
    expect(body.status).toBe("MATCHING")
    expect(mockSessionCreate).toHaveBeenCalledWith({ data: { groupId: "group-1", status: "MATCHING" } })

    // 2) Matching en arrière-plan : on déclenche le callback `after`.
    expect(mockAfter.cb).toBeInstanceOf(Function)
    await mockAfter.cb!()

    expect(mockSearchVenues).toHaveBeenCalled()
    expect(mockRecommendationCreate).toHaveBeenCalledTimes(1)
    const createArg = mockRecommendationCreate.mock.calls[0][0]
    expect(createArg.data).toHaveLength(1)
    expect(createArg.data[0].name).toBe("Le Petit Zinc")
    expect(mockSessionUpdate).toHaveBeenCalledWith({ where: { id: "session-1" }, data: { status: "VOTING" } })
  })

  it("should return 400 if group has no preferences yet", async () => {
    mockSession.mockResolvedValue({ user: { id: "user-1" } })
    mockGroupFind.mockResolvedValue({ ...MOCK_GROUP, preferences: [] })

    const res = await POST(new NextRequest("http://localhost/api/match", { method: "POST", body: JSON.stringify({ groupId: "group-1" }) }))
    expect(res.status).toBe(400)
  })
})
