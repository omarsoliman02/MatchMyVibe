import { POST } from "@/app/api/groups/route"
import { NextRequest } from "next/server"

jest.mock("@/lib/prisma/client", () => ({
  prisma: {
    group: { create: jest.fn() },
  },
}))

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}))

jest.mock("@/lib/auth/config", () => ({ authOptions: {} }))

import { prisma } from "@/lib/prisma/client"
import { getServerSession } from "next-auth"

const mockCreate = prisma.group.create as jest.Mock
const mockSession = getServerSession as jest.Mock

const makeRequest = (body: object) =>
  new NextRequest("http://localhost:3000/api/groups", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })

describe("POST /api/groups", () => {
  beforeEach(() => jest.clearAllMocks())

  it("should create a group and return 201", async () => {
    mockSession.mockResolvedValue({ user: { id: "user-1", email: "test@test.com" } })
    mockCreate.mockResolvedValue({
      id: "group-1",
      name: "Les copains",
      inviteCode: "abc123",
      createdAt: new Date(),
    })

    const res = await POST(makeRequest({ name: "Les copains" }))
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.group.name).toBe("Les copains")
    expect(body.group.inviteCode).toBeDefined()
  })

  it("should return 401 if not authenticated", async () => {
    mockSession.mockResolvedValue(null)

    const res = await POST(makeRequest({ name: "Les copains" }))

    expect(res.status).toBe(401)
  })

  it("should return 400 if name is missing", async () => {
    mockSession.mockResolvedValue({ user: { id: "user-1" } })

    const res = await POST(makeRequest({}))

    expect(res.status).toBe(400)
  })
})
