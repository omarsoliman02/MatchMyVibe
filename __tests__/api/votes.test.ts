import { POST } from "@/app/api/votes/route"
import { NextRequest } from "next/server"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth/config", () => ({ authOptions: {} }))
jest.mock("@/lib/sse/broadcaster", () => ({ broadcast: jest.fn() }))
jest.mock("@/lib/prisma/client", () => ({
  prisma: {
    session: { findUnique: jest.fn() },
    vote: { upsert: jest.fn() },
    recommendation: { findMany: jest.fn() },
  },
}))

import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma/client"
import { broadcast } from "@/lib/sse/broadcaster"

const mockSession = getServerSession as jest.Mock
const mockSessionFind = prisma.session.findUnique as jest.Mock
const mockVoteUpsert = prisma.vote.upsert as jest.Mock
const mockRecommendationFind = prisma.recommendation.findMany as jest.Mock
const mockBroadcast = broadcast as jest.Mock

const makeRequest = (body: object) =>
  new NextRequest("http://localhost/api/votes", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })

describe("POST /api/votes", () => {
  beforeEach(() => jest.clearAllMocks())

  it("should cast a vote and broadcast to session members", async () => {
    mockSession.mockResolvedValue({ user: { id: "user-1" } })
    mockSessionFind.mockResolvedValue({
      id: "session-1",
      status: "VOTING",
      groupId: "group-1",
      group: { members: [{ userId: "user-1" }, { userId: "user-2" }] },
    })
    mockVoteUpsert.mockResolvedValue({ id: "vote-1", recommendationId: "rec-1" })
    mockRecommendationFind.mockResolvedValue([
      { id: "rec-1", _count: { votes: 1 } },
    ])

    const res = await POST(
      makeRequest({ sessionId: "session-1", recommendationId: "rec-1" })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.vote).toBeDefined()
    expect(mockBroadcast).toHaveBeenCalledWith("session-1", expect.objectContaining({
      recommendationId: "rec-1",
      voteCount: expect.any(Number),
    }))
  })

  it("should return 403 when session is not in VOTING status", async () => {
    mockSession.mockResolvedValue({ user: { id: "user-1" } })
    mockSessionFind.mockResolvedValue({
      id: "session-1",
      status: "DONE",
      group: { members: [{ userId: "user-1" }] },
    })

    const res = await POST(
      makeRequest({ sessionId: "session-1", recommendationId: "rec-1" })
    )

    expect(res.status).toBe(403)
  })

  it("should return 401 when not authenticated", async () => {
    mockSession.mockResolvedValue(null)

    const res = await POST(
      makeRequest({ sessionId: "session-1", recommendationId: "rec-1" })
    )

    expect(res.status).toBe(401)
  })
})
