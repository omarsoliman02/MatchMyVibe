import { LogoBadge } from "@/components/ui/logo"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface-grid relative min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm reveal">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <LogoBadge className="w-14 h-14" />
          </div>
          <h1 className="text-[1.6rem] font-semibold tracking-tight text-fg">
            Match<span className="text-faint">MyVibe</span>
          </h1>
          <p className="text-muted mt-1.5 text-sm">
            La fin du «&nbsp;Je sais pas, on fait quoi&nbsp;?&nbsp;»
          </p>
        </div>
        {children}
        <p className="text-center text-xs text-faint mt-8">
          Vos préférences · une IA · le lieu parfait pour votre groupe
        </p>
      </div>
    </div>
  )
}
