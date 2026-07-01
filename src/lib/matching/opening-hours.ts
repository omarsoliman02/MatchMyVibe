// Parseur volontairement minimal du tag OSM "opening_hours". La spécification
// complète (https://wiki.openstreetmap.org/wiki/Key:opening_hours) couvre des
// cas bien plus riches (jours fériés "PH", mois, semaines paires/impaires...).
// Ici on couvre les cas les plus fréquents (jours + plages horaires, "24/7",
// "off"/"closed") et on retombe sur une analyse de texte libre en dernier
// recours plutôt que d'échouer silencieusement. Limite assumée pour un projet
// démonstrateur.

export interface OpenStatus {
  isOpen: boolean | null
  reason: string
}

const CODE_TO_INDEX: Record<string, number> = { Mo: 0, Tu: 1, We: 2, Th: 3, Fr: 4, Sa: 5, Su: 6 }
const FR_DAY_NAMES = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]

// Lundi = 0 ... Dimanche = 6, pour matcher l'ordre des codes OSM (Mo..Su).
function mondayFirstDayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

function expandDayTokens(daysPart: string): Set<number> {
  const days = new Set<number>()
  for (const token of daysPart.split(",").map((t) => t.trim()).filter(Boolean)) {
    const range = token.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)-(Mo|Tu|We|Th|Fr|Sa|Su)$/)
    if (range) {
      const start = CODE_TO_INDEX[range[1]]
      const end = CODE_TO_INDEX[range[2]]
      for (let i = start; ; i = (i + 1) % 7) {
        days.add(i)
        if (i === end) break
      }
      continue
    }
    if (token in CODE_TO_INDEX) days.add(CODE_TO_INDEX[token])
  }
  return days
}

function minutesOfDay(hhmm: string): number | null {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const hours = Number(m[1])
  const minutes = Number(m[2])
  if (minutes > 59) return null
  return hours * 60 + minutes
}

// true/false si une des plages "HH:MM-HH:MM" (séparées par virgules) couvre l'heure
// actuelle, null si aucune plage n'a pu être parsée (format inattendu).
function isWithinTimeRanges(timePart: string, nowMinutes: number): boolean | null {
  const ranges = timePart.split(",").map((r) => r.trim()).filter(Boolean)
  let sawValidRange = false
  for (const range of ranges) {
    const [startStr, endStr] = range.split("-").map((s) => s?.trim())
    const start = startStr ? minutesOfDay(startStr) : null
    const end = endStr ? minutesOfDay(endStr) : null
    if (start === null || end === null) continue
    sawValidRange = true
    if (end > start) {
      if (nowMinutes >= start && nowMinutes < end) return true
    } else {
      // Plage à cheval sur minuit (ex: 22:00-02:00).
      if (nowMinutes >= start || nowMinutes < end) return true
    }
  }
  return sawValidRange ? false : null
}

// Parse le tag OSM en règles séparées par ";" ; la dernière règle qui couvre le
// jour courant l'emporte (comportement standard OSM pour gérer les exceptions,
// ex: "Mo-Su 09:00-18:00; Tu off"). Retourne null si aucune règle n'a pu être
// reconnue, pour signaler à l'appelant de tenter l'analyse en texte libre.
function parseOsmOpeningHours(tag: string, now: Date): boolean | null {
  const rules = tag.split(";").map((r) => r.trim()).filter(Boolean)
  if (rules.length === 0) return null

  const today = mondayFirstDayIndex(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  let recognizedAnyRule = false
  let status: boolean | null = null

  for (const rule of rules) {
    if (/^24\/7$/i.test(rule)) {
      recognizedAnyRule = true
      status = true
      continue
    }

    const offMatch = rule.match(/^([A-Za-z,-]+)\s+(off|closed)$/i)
    if (offMatch) {
      const days = expandDayTokens(offMatch[1])
      if (days.size === 0) continue
      recognizedAnyRule = true
      if (days.has(today)) status = false
      continue
    }

    const timedMatch = rule.match(/^([A-Za-z,-]+)\s+(\d.+)$/)
    if (timedMatch) {
      const days = expandDayTokens(timedMatch[1])
      if (days.size === 0) continue
      recognizedAnyRule = true
      if (days.has(today)) {
        const openNow = isWithinTimeRanges(timedMatch[2], nowMinutes)
        if (openNow !== null) status = openNow
      }
      continue
    }
  }

  if (!recognizedAnyRule) return null
  // Un format reconnu qui ne couvre pas le jour courant signifie "fermé ce jour-là".
  return status ?? false
}

// Dernier recours pour du texte libre non structuré (ex: "fermé le lundi",
// "ouvert 24h/24 7j/7"). Ne détecte que des signaux explicites ; sinon on
// préfère renvoyer "inconnu" plutôt qu'une supposition non fondée.
function parseFreeTextOpeningHours(tag: string, now: Date): OpenStatus {
  const text = tag.toLowerCase()

  if (/24\s*\/\s*7|24\s*h\s*\/\s*24|7\s*j\s*\/\s*7/.test(text)) {
    return { isOpen: true, reason: "Ouvert maintenant (24/7, texte libre)" }
  }

  const todayName = FR_DAY_NAMES[now.getDay()]
  const closedIdx = text.indexOf("fermé")
  if (closedIdx !== -1 && text.slice(closedIdx, closedIdx + 30).includes(todayName)) {
    return { isOpen: false, reason: `Fermé aujourd'hui (texte libre : "${tag}")` }
  }

  return { isOpen: null, reason: "Horaires non structurés, statut incertain" }
}

/**
 * Détermine si un lieu est ouvert à l'instant `now` à partir du tag OSM
 * "opening_hours". Trois issues possibles :
 * - format OSM standard reconnu -> isOpen déterministe (true/false)
 * - texte libre non structuré -> heuristique de secours (24/7, "fermé le X")
 * - rien d'exploitable (tag absent, ou texte trop ambigu) -> isOpen: null
 *   ("inconnu", à ne jamais confondre avec "fermé")
 */
export function isOpenNow(openingHoursTag: string | undefined, now: Date = new Date()): OpenStatus {
  const tag = openingHoursTag?.trim()
  if (!tag) return { isOpen: null, reason: "Horaires inconnus" }

  const structured = parseOsmOpeningHours(tag, now)
  if (structured !== null) {
    return structured
      ? { isOpen: true, reason: "Ouvert maintenant" }
      : { isOpen: false, reason: "Fermé actuellement" }
  }

  return parseFreeTextOpeningHours(tag, now)
}
