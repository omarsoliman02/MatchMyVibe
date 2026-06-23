import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/ui/navbar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar userName={session.user?.name ?? ""} />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 sm:py-10">{children}</main>
    </div>
  )
}
