type IconProps = { className?: string }

const svg = (className: string, children: React.ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
)

export const ArrowLeft = ({ className = "w-4 h-4" }: IconProps) =>
  svg(className, <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>)

export const Plus = ({ className = "w-4 h-4" }: IconProps) =>
  svg(className, <><path d="M12 5v14" /><path d="M5 12h14" /></>)

export const Users = ({ className = "w-5 h-5" }: IconProps) =>
  svg(
    className,
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  )

export const MapPin = ({ className = "w-5 h-5" }: IconProps) =>
  svg(
    className,
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </>
  )

export const Sparkles = ({ className = "w-5 h-5" }: IconProps) =>
  svg(
    className,
    <>
      <path d="M12 3l1.6 4.6L18 9.2l-4.4 1.6L12 15l-1.6-4.2L6 9.2l4.4-1.6L12 3Z" />
      <path d="M19 14l.7 2 .3.8 2 .7-2 .7-.3.8-.7 2-.7-2-.3-.8-2-.7 2-.7.3-.8.7-2Z" />
    </>
  )

export const Check = ({ className = "w-4 h-4" }: IconProps) =>
  svg(className, <path d="M20 6 9 17l-5-5" />)

export const Copy = ({ className = "w-4 h-4" }: IconProps) =>
  svg(
    className,
    <>
      <rect width="13" height="13" x="9" y="9" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  )

export const ChevronRight = ({ className = "w-4 h-4" }: IconProps) =>
  svg(className, <path d="m9 18 6-6-6-6" />)

export const Clock = ({ className = "w-4 h-4" }: IconProps) =>
  svg(className, <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>)

export const Wallet = ({ className = "w-5 h-5" }: IconProps) =>
  svg(
    className,
    <>
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" />
      <path d="M16 12h.01" />
    </>
  )

export const Salad = ({ className = "w-5 h-5" }: IconProps) =>
  svg(
    className,
    <>
      <path d="M7 21h10" />
      <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z" />
      <path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7" />
    </>
  )

export const Trophy = ({ className = "w-5 h-5" }: IconProps) =>
  svg(
    className,
    <>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </>
  )

export const Sun = ({ className = "w-4 h-4" }: IconProps) =>
  svg(
    className,
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
    </>
  )

export const Moon = ({ className = "w-4 h-4" }: IconProps) =>
  svg(className, <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />)
