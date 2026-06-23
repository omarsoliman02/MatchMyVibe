import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { prisma } from "@/lib/prisma/client"
import { authOptions } from "@/lib/auth/config"

const joinSchema = z.object({ inviteCode: z.string().min(1) })

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = joinSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "inviteCode required" }, { status: 400 })
  }

  const group = await prisma.group.findUnique({
    where: { inviteCode: parsed.data.inviteCode },
  })

  if (!group) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 })
  }

  const existing = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: group.id } },
  })

  if (existing) {
    return NextResponse.json({ error: "Already a member" }, { status: 409 })
  }

  await prisma.groupMember.create({
    data: { userId: session.user.id, groupId: group.id, role: "MEMBER" },
  })

  return NextResponse.json({ group })
}
