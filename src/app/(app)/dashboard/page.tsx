import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/prisma/client"
import Link from "next/link"
import { Plus, Users, ChevronRight, Check, Clock, Sparkles } from "@/components/ui/icons"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const groups = await prisma.group.findMany({
    where: { members: { some: { userId: session.user.id } } },
    include: {
      members: true,
      preferences: true,
      sessions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Mes groupes</h1>
          <p className="text-sm text-muted mt-1">Organise ta prochaine sortie en quelques clics.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/groups/join" className="btn btn-secondary">Rejoindre</Link>
          <Link href="/groups/create" className="btn btn-primary">
            <Plus className="w-4 h-4" /> Nouveau groupe
          </Link>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent-soft border border-accent-soft text-accent flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="font-semibold text-fg">Aucun groupe pour l&apos;instant</h3>
          <p className="text-sm text-muted mt-1.5 max-w-xs mx-auto">
            Crée un groupe et invite tes amis, ou rejoins-en un avec un code d&apos;invitation.
          </p>
          <div className="flex gap-2 justify-center mt-6">
            <Link href="/groups/create" className="btn btn-primary">
              <Plus className="w-4 h-4" /> Créer un groupe
            </Link>
            <Link href="/groups/join" className="btn btn-secondary">Rejoindre</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group, i) => {
            const prefsCount = group.preferences.length
            const membersCount = group.members.length
            const latestSession = group.sessions[0]
            const pct = membersCount ? Math.round((prefsCount / membersCount) * 100) : 0

            return (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="block card card-interactive p-5 reveal"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-accent-soft border border-accent-soft text-accent flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-fg truncate">{group.name}</h3>
                      <p className="text-sm text-muted mt-0.5">
                        {membersCount} membre{membersCount > 1 ? "s" : ""} · {prefsCount}/{membersCount} préférences
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge session={latestSession} prefsCount={prefsCount} membersCount={membersCount} />
                    <ChevronRight className="w-4 h-4 text-faint" />
                  </div>
                </div>
                <div className="mt-4 h-1 rounded-full bg-subtle overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatusBadge({
  session,
  prefsCount,
  membersCount,
}: {
  session: { status: string } | undefined
  prefsCount: number
  membersCount: number
}) {
  if (session?.status === "VOTING") {
    return <span className="badge badge-accent"><Sparkles className="w-3 h-3" /> Vote en cours</span>
  }
  if (session?.status === "DONE") {
    return <span className="badge badge-success"><Check className="w-3 h-3" /> Terminé</span>
  }
  if (prefsCount === membersCount && membersCount > 0) {
    return <span className="badge badge-accent">Prêt à matcher</span>
  }
  return <span className="badge badge-neutral"><Clock className="w-3 h-3" /> En attente</span>
}
