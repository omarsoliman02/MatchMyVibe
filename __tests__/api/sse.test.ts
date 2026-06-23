import { GET } from "@/app/api/sse/route"
import { NextRequest } from "next/server"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth/config", () => ({ authOptions: {} }))
jest.mock("@/lib/sse/broadcaster", () => ({ subscribe: jest.fn() }))

import { getServerSession } from "next-auth"
import { subscribe } from "@/lib/sse/broadcaster"

const mockSession = getServerSession as jest.Mock
const mockSubscribe = subscribe as jest.Mock

describe("GET /api/sse", () => {
  beforeEach(() => jest.clearAllMocks())

  it("should return 401 when not authenticated", async () => {
    mockSession.mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/sse?sessionId=s-1")
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it("should return 400 when sessionId is missing", async () => {
    mockSession.mockResolvedValue({ user: { id: "user-1" } })
    const req = new NextRequest("http://localhost/api/sse")
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it("should return a streaming response with SSE headers", async () => {
    mockSession.mockResolvedValue({ user: { id: "user-1" } })
    mockSubscribe.mockImplementation((_id, _cb) => () => {})

    const req = new NextRequest("http://localhost/api/sse?sessionId=session-1")
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toContain("text/event-stream")
    expect(res.headers.get("Cache-Control")).toBe("no-cache")
  })
})
