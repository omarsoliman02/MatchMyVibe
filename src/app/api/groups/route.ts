import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { prisma } from "@/lib/prisma/client"
import { authOptions } from "@/lib/auth/config"

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createGroupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const group = await prisma.group.create({
    data: {
      name: parsed.data.name,
      members: {
        create: { userId: session.user.id, role: "ADMIN" },
      },
    },
    select: { id: true, name: true, inviteCode: true, createdAt: true },
  })

  return NextResponse.json({ group }, { status: 201 })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const groups = await prisma.group.findMany({
    where: { members: { some: { userId: session.user.id } } },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ groups })
}
