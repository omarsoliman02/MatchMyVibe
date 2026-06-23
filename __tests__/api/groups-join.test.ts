import { POST } from "@/app/api/groups/join/route"
import { NextRequest } from "next/server"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth/config", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma/client", () => ({
  prisma: {
    group: { findUnique: jest.fn() },
    groupMember: { findUnique: jest.fn(), create: jest.fn() },
  },
}))

import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma/client"

const mockSession = getServerSession as jest.Mock
const mockGroupFind = prisma.group.findUnique as jest.Mock
const mockMemberFind = prisma.groupMember.findUnique as jest.Mock
const mockMemberCreate = prisma.groupMember.create as jest.Mock

const makeRequest = (body: object) =>
  new NextRequest("http://localhost/api/groups/join", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })

describe("POST /api/groups/join", () => {
  beforeEach(() => jest.clearAllMocks())

  it("should add user to group and return 200", async () => {
    mockSession.mockResolvedValue({ user: { id: "user-2" } })
    mockGroupFind.mockResolvedValue({ id: "group-1", name: "Les copains", inviteCode: "abc123" })
    mockMemberFind.mockResolvedValue(null)
    mockMemberCreate.mockResolvedValue({ userId: "user-2", groupId: "group-1", role: "MEMBER" })

    const res = await POST(makeRequest({ inviteCode: "abc123" }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.group.id).toBe("group-1")
  })

  it("should return 404 for unknown invite code", async () => {
    mockSession.mockResolvedValue({ user: { id: "user-2" } })
    mockGroupFind.mockResolvedValue(null)

    const res = await POST(makeRequest({ inviteCode: "unknown" }))
    expect(res.status).toBe(404)
  })

  it("should return 409 when user is already a member", async () => {
    mockSession.mockResolvedValue({ user: { id: "user-1" } })
    mockGroupFind.mockResolvedValue({ id: "group-1", inviteCode: "abc123" })
    mockMemberFind.mockResolvedValue({ userId: "user-1", groupId: "group-1" })

    const res = await POST(makeRequest({ inviteCode: "abc123" }))
    expect(res.status).toBe(409)
  })

  it("should return 401 when not authenticated", async () => {
    mockSession.mockResolvedValue(null)
    const res = await POST(makeRequest({ inviteCode: "abc123" }))
    expect(res.status).toBe(401)
  })
})
