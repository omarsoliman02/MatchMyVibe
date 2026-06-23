import { GET } from "@/app/api/groups/[groupId]/route"
import { NextRequest } from "next/server"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth/config", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma/client", () => ({
  prisma: {
    group: { findUnique: jest.fn() },
  },
}))

import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma/client"

const mockSession = getServerSession as jest.Mock
const mockGroupFind = prisma.group.findUnique as jest.Mock

const makeRequest = (groupId: string) =>
  new NextRequest(`http://localhost/api/groups/${groupId}`)

describe("GET /api/groups/[groupId]", () => {
  beforeEach(() => jest.clearAllMocks())

  it("should return group with members and preference status", async () => {
    mockSession.mockResolvedValue({ user: { id: "user-1" } })
    mockGroupFind.mockResolvedValue({
      id: "group-1",
      name: "Les copains",
      inviteCode: "abc123",
      members: [
        { userId: "user-1", role: "ADMIN", user: { id: "user-1", name: "Benoit", email: "b@test.com" } },
        { userId: "user-2", role: "MEMBER", user: { id: "user-2", name: "Camille", email: "c@test.com" } },
      ],
      preferences: [{ userId: "user-1" }],
      sessions: [],
    })

    const res = await GET(makeRequest("group-1"), { params: Promise.resolve({ groupId: "group-1" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.group.name).toBe("Les copains")
    expect(body.group.membersWithPreferenceStatus).toHaveLength(2)
    expect(body.group.membersWithPreferenceStatus[0].hasPreference).toBe(true)
    expect(body.group.membersWithPreferenceStatus[1].hasPreference).toBe(false)
  })

  it("should return 403 when user is not a member", async () => {
    mockSession.mockResolvedValue({ user: { id: "user-99" } })
    mockGroupFind.mockResolvedValue({
      id: "group-1",
      members: [{ userId: "user-1" }],
      preferences: [],
      sessions: [],
    })

    const res = await GET(makeRequest("group-1"), { params: Promise.resolve({ groupId: "group-1" }) })
    expect(res.status).toBe(403)
  })

  it("should return 404 when group does not exist", async () => {
    mockSession.mockResolvedValue({ user: { id: "user-1" } })
    mockGroupFind.mockResolvedValue(null)

    const res = await GET(makeRequest("group-1"), { params: Promise.resolve({ groupId: "group-1" }) })
    expect(res.status).toBe(404)
  })
})
