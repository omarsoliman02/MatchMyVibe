import { POST } from "@/app/api/auth/register/route"
import { NextRequest } from "next/server"

jest.mock("@/lib/prisma/client", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
}))

import { prisma } from "@/lib/prisma/client"

const mockFindUnique = prisma.user.findUnique as jest.Mock
const mockCreate = prisma.user.create as jest.Mock

const makeRequest = (body: object) =>
  new NextRequest("http://localhost:3000/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })

describe("POST /api/auth/register", () => {
  beforeEach(() => jest.clearAllMocks())

  it("should create a user and return 201", async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({
      id: "user-1",
      email: "benoit@test.com",
      name: "Benoit",
    })

    const res = await POST(
      makeRequest({ email: "benoit@test.com", name: "Benoit", password: "secret123" })
    )
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.user.email).toBe("benoit@test.com")
    expect(body.user).not.toHaveProperty("password")
  })

  it("should return 409 if email already exists", async () => {
    mockFindUnique.mockResolvedValue({ id: "existing", email: "benoit@test.com" })

    const res = await POST(
      makeRequest({ email: "benoit@test.com", name: "Benoit", password: "secret123" })
    )

    expect(res.status).toBe(409)
  })

  it("should return 400 for invalid input (missing name)", async () => {
    const res = await POST(
      makeRequest({ email: "benoit@test.com", password: "secret123" })
    )

    expect(res.status).toBe(400)
  })

  it("should return 400 for a weak password (less than 6 chars)", async () => {
    const res = await POST(
      makeRequest({ email: "benoit@test.com", name: "Benoit", password: "abc" })
    )

    expect(res.status).toBe(400)
  })
})
