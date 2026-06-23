import Link from "next/link"

/**
 * Marque MatchMyVibe : deux disques qui se chevauchent = les préférences
 * du groupe qui se rejoignent ("match"). Utilise currentColor.
 */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
      <circle cx="10.25" cy="14" r="7.75" fill="currentColor" fillOpacity="0.4" />
      <circle cx="17.75" cy="14" r="7.75" fill="currentColor" />
    </svg>
  )
}

/** Badge "app icon" : marque blanche sur carré indigo arrondi. */
export function LogoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 ${className}`}
    >
      <LogoMark className="w-3/5 h-3/5" />
    </span>
  )
}

/** Marque + mot. */
export function Logo({
  className = "",
  href = "/dashboard",
}: {
  className?: string
  href?: string | null
}) {
  const content = (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="w-6 h-6 text-accent" />
      <span className="font-semibold text-[0.975rem] tracking-tight text-fg">
        Match<span className="text-faint">MyVibe</span>
      </span>
    </span>
  )

  if (href === null) return content
  return <Link href={href} className="inline-flex">{content}</Link>
}
