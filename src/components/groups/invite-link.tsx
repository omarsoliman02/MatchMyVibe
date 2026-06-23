"use client"

import { useState } from "react"
import { Copy, Check } from "@/components/ui/icons"

export function InviteLink({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-fg">Inviter au groupe</h2>
        <span className="text-xs text-faint">Code d&apos;invitation</span>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-subtle border border-line rounded-lg px-3 py-2.5 text-sm font-mono text-accent-strong truncate">
          {inviteCode}
        </code>
        <button onClick={copy} className={`btn shrink-0 ${copied ? "btn-primary" : "btn-secondary"}`}>
          {copied ? <><Check className="w-4 h-4" /> Copié</> : <><Copy className="w-4 h-4" /> Copier</>}
        </button>
      </div>
      <p className="text-xs text-faint mt-2.5">Partage ce code pour que tes amis rejoignent le groupe.</p>
    </div>
  )
}
