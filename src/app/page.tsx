import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Users, Salad, Sparkles, Check } from "@/components/ui/icons"

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (session) redirect("/dashboard")

  return (
    <div className="surface-grid min-h-screen flex flex-col">
      <header className="w-full">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <Logo href={null} />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="btn btn-ghost px-3 py-2 hidden sm:inline-flex">Se connecter</Link>
            <Link href="/register" className="btn btn-primary">Créer un compte</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-3xl mx-auto px-5 pt-16 sm:pt-24 pb-16 text-center">
          <span className="badge badge-accent reveal">
            <Sparkles className="w-3 h-3" /> Décidez en groupe, sans débattre
          </span>
          <h1
            className="text-4xl sm:text-[3.25rem] sm:leading-[1.05] font-semibold tracking-tight text-fg mt-5 reveal"
            style={{ animationDelay: "60ms" }}
          >
            Le lieu parfait pour votre groupe,
            <br className="hidden sm:block" /> trouvé en une minute.
          </h1>
          <p className="text-lg text-muted mt-5 max-w-xl mx-auto reveal" style={{ animationDelay: "120ms" }}>
            Chacun donne ses préférences — budget, régime, type de sortie — et l&apos;IA propose les
            meilleurs spots autour de vous. Vous votez, c&apos;est réglé.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8 reveal" style={{ animationDelay: "180ms" }}>
            <Link href="/register" className="btn btn-primary btn-lg">Commencer gratuitement</Link>
            <Link href="/login" className="btn btn-secondary btn-lg">J&apos;ai déjà un compte</Link>
          </div>

          {/* Aperçu : carte de recommandation */}
          <div className="mt-14 max-w-md mx-auto text-left reveal" style={{ animationDelay: "260ms" }}>
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="badge badge-accent"><Sparkles className="w-3 h-3" /> Recommandation IA</span>
                <span className="badge badge-success"><Check className="w-3 h-3" /> Choix du groupe</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-subtle border border-line flex items-center justify-center text-xl shrink-0">🍽️</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-faint">#1</span>
                    <h3 className="font-semibold text-fg">Le Potager du Marais</h3>
                  </div>
                  <p className="text-sm text-muted mt-0.5">24 Rue Rambuteau, Paris</p>
                </div>
                <div className="ml-auto text-right shrink-0">
                  <p className="text-lg font-bold text-accent leading-none">96%</p>
                  <p className="text-xs text-faint mt-1">compatibilité</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {["Végétarien ✓", "Dans le budget", "Central"].map((t) => (
                  <span key={t} className="text-xs bg-subtle text-muted px-2 py-1 rounded-full">{t}</span>
                ))}
              </div>
              <div className="h-1.5 bg-subtle rounded-full overflow-hidden mt-4">
                <div className="h-full bg-accent rounded-full" style={{ width: "75%" }} />
              </div>
              <p className="text-xs text-faint mt-1.5">3/4 votes</p>
            </div>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-5 pb-24">
          <div className="grid sm:grid-cols-3 gap-4">
            <Step icon={<Users className="w-5 h-5" />} n="1" title="Crée un groupe" desc="Invite tes amis avec un simple code." delay={0} />
            <Step icon={<Salad className="w-5 h-5" />} n="2" title="Chacun ses préférences" desc="Budget, régime, type de sortie, position." delay={80} />
            <Step icon={<Sparkles className="w-5 h-5" />} n="3" title="L'IA propose, vous votez" desc="Les meilleurs lieux compatibles, en direct." delay={160} />
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between text-sm text-faint">
          <Logo href={null} />
          <span>© {new Date().getFullYear()} MatchMyVibe</span>
        </div>
      </footer>
    </div>
  )
}

function Step({
  icon, n, title, desc, delay,
}: { icon: React.ReactNode; n: string; title: string; desc: string; delay: number }) {
  return (
    <div className="card p-5 reveal" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-3 mb-3">
        <span className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center">{icon}</span>
        <span className="text-xs font-semibold text-faint">Étape {n}</span>
      </div>
      <h3 className="font-semibold text-fg">{title}</h3>
      <p className="text-sm text-muted mt-1">{desc}</p>
    </div>
  )
}
