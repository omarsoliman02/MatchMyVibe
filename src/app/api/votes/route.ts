import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { prisma } from "@/lib/prisma/client"
import { authOptions } from "@/lib/auth/config"
import { broadcast } from "@/lib/sse/broadcaster"

const voteSchema = z.object({
  sessionId: z.string().min(1),
  recommendationId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = voteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const { sessionId, recommendationId } = parsed.data

  const gameSession = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { group: { include: { members: true } } },
  })

  if (!gameSession || gameSession.status !== "VOTING") {
    return NextResponse.json({ error: "Voting is not open" }, { status: 403 })
  }

  const vote = await prisma.vote.upsert({
    where: { userId_sessionId: { userId: session.user.id, sessionId } },
    create: { userId: session.user.id, sessionId, recommendationId },
    update: { recommendationId },
  })

  const recommendations = await prisma.recommendation.findMany({
    where: { sessionId },
    include: { _count: { select: { votes: true } } },
  })

  const totalMembers = gameSession.group.members.length

  recommendations.forEach((rec) => {
    broadcast(sessionId, {
      type: "vote",
      recommendationId: rec.id,
      voteCount: rec._count.votes,
      totalMembers,
    })
  })

  return NextResponse.json({ vote })
}
