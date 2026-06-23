type Listener = (data: string) => void

const sessionListeners = new Map<string, Set<Listener>>()

export function subscribe(sessionId: string, listener: Listener): () => void {
  if (!sessionListeners.has(sessionId)) {
    sessionListeners.set(sessionId, new Set())
  }
  sessionListeners.get(sessionId)!.add(listener)

  return () => {
    sessionListeners.get(sessionId)?.delete(listener)
    if (sessionListeners.get(sessionId)?.size === 0) {
      sessionListeners.delete(sessionId)
    }
  }
}

export function broadcast(sessionId: string, event: object): void {
  const listeners = sessionListeners.get(sessionId)
  if (!listeners) return
  const data = `data: ${JSON.stringify(event)}\n\n`
  listeners.forEach((listener) => listener(data))
}
