import { GET } from "@/app/api/sessions/[sessionId]/route"
import { NextRequest } from "next/server"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth/config", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma/client", () => ({
  prisma: {
    session: { findUnique: jest.fn() },
  },
}))

import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma/client"

const mockSession = getServerSession as jest.Mock
const mockSessionFind = prisma.session.findUnique as jest.Mock

const makeRequest = (sessionId: string) =>
  new NextRequest(`http://localhost/api/sessions/${sessionId}`)

describe("GET /api/sessions/[sessionId]", () => {
  beforeEach(() => jest.clearAllMocks())

  it("should return session with recommendations and vote counts", async () => {
    mockSession.mockResolvedValue({ user: { id: "user-1" } })
    mockSessionFind.mockResolvedValue({
      id: "session-1",
      status: "VOTING",
      groupId: "group-1",
      createdAt: new Date(),
      group: {
        members: [{ userId: "user-1" }, { userId: "user-2" }],
      },
      recommendations: [
        {
          id: "rec-1",
          name: "Le Petit Zinc",
          address: "11 rue de Buci",
          score: 0.92,
          venueType: "restaurant",
          latitude: 48.86,
          longitude: 2.36,
          details: {},
          _count: { votes: 1 },
        },
      ],
      votes: [{ userId: "user-1", recommendationId: "rec-1" }],
    })

    const res = await GET(makeRequest("session-1"), { params: Promise.resolve({ sessionId: "session-1" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.session.status).toBe("VOTING")
    expect(body.session.recommendations).toHaveLength(1)
    expect(body.session.recommendations[0].voteCount).toBe(1)
    expect(body.session.userVote).toBe("rec-1")
    expect(body.session.totalMembers).toBe(2)
  })

  it("should return 404 when session does not exist", async () => {
    mockSession.mockResolvedValue({ user: { id: "user-1" } })
    mockSessionFind.mockResolvedValue(null)

    const res = await GET(makeRequest("bad-id"), { params: Promise.resolve({ sessionId: "bad-id" }) })
    expect(res.status).toBe(404)
  })

  it("should return 403 when user is not a group member", async () => {
    mockSession.mockResolvedValue({ user: { id: "user-99" } })
    mockSessionFind.mockResolvedValue({
      id: "session-1",
      status: "VOTING",
      group: { members: [{ userId: "user-1" }] },
      recommendations: [],
      votes: [],
    })

    const res = await GET(makeRequest("session-1"), { params: Promise.resolve({ sessionId: "session-1" }) })
    expect(res.status).toBe(403)
  })
})
