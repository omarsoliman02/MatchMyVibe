import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { SessionProvider } from "@/components/providers/session-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "MatchMyVibe — Décidez où sortir, ensemble",
  description:
    "La fin du « Je sais pas, on fait quoi ? ». Vos préférences, une IA, le lieu parfait pour votre groupe.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${GeistSans.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}})()",
          }}
        />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
