import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma/client"
import { authOptions } from "@/lib/auth/config"

type Params = { params: Promise<{ sessionId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { sessionId } = await params

  const gameSession = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      group: { include: { members: true } },
      recommendations: {
        include: { _count: { select: { votes: true } } },
        orderBy: { score: "desc" },
      },
      votes: true,
    },
  })

  if (!gameSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  const isMember = gameSession.group.members.some(
    (m) => m.userId === session.user.id
  )
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const userVote = gameSession.votes.find(
    (v) => v.userId === session.user.id
  )?.recommendationId ?? null

  const recommendations = gameSession.recommendations.map((rec) => ({
    id: rec.id,
    name: rec.name,
    address: rec.address,
    score: rec.score,
    venueType: rec.venueType,
    latitude: rec.latitude,
    longitude: rec.longitude,
    details: rec.details,
    voteCount: rec._count.votes,
  }))

  return NextResponse.json({
    session: {
      id: gameSession.id,
      status: gameSession.status,
      groupId: gameSession.groupId,
      createdAt: gameSession.createdAt,
      recommendations,
      userVote,
      totalMembers: gameSession.group.members.length,
    },
  })
}
