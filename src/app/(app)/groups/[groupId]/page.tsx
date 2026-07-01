import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/prisma/client"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { InviteLink } from "@/components/groups/invite-link"
import { MatchButton } from "@/components/groups/match-button"
import { ArrowLeft, Check, MapPin, Sparkles } from "@/components/ui/icons"

type Props = { params: Promise<{ groupId: string }> }

export default async function GroupDetailPage({ params }: Props) {
  const { groupId } = await params
  const session = await getServerSession(authOptions)

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      preferences: true,
      sessions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  })

  if (!group) notFound()

  const isMember = group.members.some((m) => m.userId === session!.user.id)
  if (!isMember) redirect("/dashboard")

  const userHasPreference = group.preferences.some((p) => p.userId === session!.user.id)
  const preferenceUserIds = new Set(group.preferences.map((p) => p.userId))
  const allPrefsCollected = preferenceUserIds.size === group.members.length
  const remaining = group.members.length - preferenceUserIds.size
  const latestSession = group.sessions[0]

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg transition-colors">
          <ArrowLeft className="w-4 h-4" /> Mes groupes
        </Link>
        <h1 className="text-2xl font-semibold text-fg mt-3">{group.name}</h1>
        <p className="text-sm text-muted mt-1">
          {group.members.length} membre{group.members.length > 1 ? "s" : ""} · {preferenceUserIds.size}/{group.members.length} prêt{preferenceUserIds.size > 1 ? "s" : ""}
        </p>
      </div>

      <InviteLink inviteCode={group.inviteCode} />

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-fg mb-4">Membres</h2>
        <div className="space-y-1">
          {group.members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-subtle text-muted flex items-center justify-center text-sm font-semibold">
                  {m.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-fg">{m.user.name}</p>
                  <p className="text-xs text-faint">{m.role === "ADMIN" ? "Organisateur" : "Membre"}</p>
                </div>
              </div>
              {preferenceUserIds.has(m.userId) ? (
                <span className="badge badge-success"><Check className="w-3 h-3" /> Prêt</span>
              ) : (
                <span className="badge badge-neutral">En attente</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {!userHasPreference ? (
          <Link href={`/groups/${groupId}/preferences`} className="btn btn-primary btn-lg w-full">
            <MapPin className="w-4 h-4" /> Remplir mes préférences
          </Link>
        ) : (
          <Link href={`/groups/${groupId}/preferences`} className="btn btn-secondary w-full">
            Modifier mes préférences
          </Link>
        )}

        {latestSession?.status === "VOTING" && (
          <Link href={`/sessions/${latestSession.id}`} className="btn btn-primary btn-lg w-full">
            <Sparkles className="w-4 h-4" /> Voir les recommandations
          </Link>
        )}

        {allPrefsCollected && latestSession?.status !== "VOTING" && (
          <div className="card p-5 text-center">
            <div className="w-11 h-11 rounded-xl bg-accent-soft border border-accent-soft text-accent flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-fg">Tout le monde est prêt&nbsp;!</p>
            <p className="text-sm text-muted mt-1 mb-4">Lance l&apos;IA pour trouver le lieu idéal pour le groupe.</p>
            <MatchButton groupId={groupId} memberCount={group.members.length} />
          </div>
        )}

        {!allPrefsCollected && (
          <p className="text-center text-sm text-faint">
            En attente de {remaining} membre{remaining > 1 ? "s" : ""} avant de lancer le matching.
          </p>
        )}
      </div>
    </div>
  )
}
