import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma/client"
import { authOptions } from "@/lib/auth/config"
import { validatePreference } from "@/lib/auth/preferences-validator"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const { groupId, ...preferenceInput } = body ?? {}

  if (!groupId) {
    return NextResponse.json({ error: "groupId required" }, { status: 400 })
  }

  let validated
  try {
    validated = validatePreference(preferenceInput)
  } catch {
    return NextResponse.json({ error: "Invalid preference data" }, { status: 400 })
  }

  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  })
  if (!member) {
    return NextResponse.json({ error: "Not a member of this group" }, { status: 403 })
  }

  const preference = await prisma.userPreference.upsert({
    where: { userId_groupId: { userId: session.user.id, groupId } },
    create: { userId: session.user.id, groupId, ...validated },
    update: validated,
  })

  return NextResponse.json({ preference }, { status: 200 })
}
