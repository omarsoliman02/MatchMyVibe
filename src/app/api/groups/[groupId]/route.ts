import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma/client"
import { authOptions } from "@/lib/auth/config"

type Params = { params: Promise<{ groupId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { groupId } = await params

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      preferences: true,
      sessions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  })

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }

  const isMember = group.members.some((m) => m.userId === session.user.id)
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const preferenceUserIds = new Set(group.preferences.map((p) => p.userId))

  const membersWithPreferenceStatus = group.members.map((m) => ({
    ...m,
    hasPreference: preferenceUserIds.has(m.userId),
  }))

  return NextResponse.json({
    group: {
      id: group.id,
      name: group.name,
      inviteCode: group.inviteCode,
      membersWithPreferenceStatus,
      latestSession: group.sessions[0] ?? null,
      allPreferencesCollected: preferenceUserIds.size === group.members.length,
    },
  })
}
