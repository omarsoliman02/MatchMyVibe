import https from "node:https"
import type { OsmVenue, VenueType } from "@/types"

const OVERPASS_HOST = "overpass-api.de"
const OVERPASS_PATH = "/api/interpreter"

const VENUE_TYPE_TO_OSM_TAGS: Record<VenueType, string> = {
  restaurant: 'amenity=restaurant',
  bar: 'amenity=bar',
  cafe: 'amenity=cafe',
  nightclub: 'amenity=nightclub',
  cinema: 'amenity=cinema',
  bowling: 'leisure=bowling_alley',
  escape_game: 'leisure=amusement_arcade',
}

export async function searchVenuesNearPoint(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  venueTypes: VenueType[]
): Promise<OsmVenue[]> {
  const tagFilters = venueTypes
    .map((type) => VENUE_TYPE_TO_OSM_TAGS[type])
    .map((tag) => {
      const [key, value] = tag.split("=")
      return `node["${key}"="${value}"](around:${radiusMeters},${latitude},${longitude});`
    })
    .join("\n")

  // NB : ne PAS mettre un maxsize bas (ex. 1 Mo) — Overpass renvoie alors une
  // "runtime error: out of memory" avec 0 élément (en HTTP 200) sur les zones denses.
  // On laisse la valeur par défaut d'Overpass.
  const query = `[out:json][timeout:25];
(
  ${tagFilters}
);
out body;`

  const body = `data=${encodeURIComponent(query)}`

  const data = await new Promise<Record<string, unknown>>((resolve, reject) => {
    const req = https.request(
      {
        host: OVERPASS_HOST,
        path: OVERPASS_PATH,
        method: "POST",
        timeout: 12_000, // l'instance publique pend parfois — on ne bloque pas le matching
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
          "User-Agent": "MatchMyVibe/1.0 (student project)",
          "Accept": "application/json",
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Overpass API error: ${res.statusCode}`))
          res.resume()
          return
        }
        const chunks: Buffer[] = []
        res.on("data", (chunk: Buffer) => chunks.push(chunk))
        res.on("end", () => resolve(JSON.parse(Buffer.concat(chunks).toString())))
        res.on("error", reject)
      }
    )
    req.on("timeout", () => req.destroy(new Error("Overpass timeout")))
    req.on("error", reject)
    req.write(body)
    req.end()
  })

  // Overpass renvoie HTTP 200 même en cas d'erreur runtime (mémoire/timeout) :
  // dans ce cas "elements" est vide et "remark" décrit l'erreur. On la fait remonter.
  if (typeof data.remark === "string" && /error/i.test(data.remark)) {
    throw new Error(`Overpass remark: ${data.remark}`)
  }

  return (data.elements as Record<string, unknown>[])
    .map(parseOsmElement)
    .filter(Boolean) as OsmVenue[]
}

function parseOsmElement(element: Record<string, unknown>): OsmVenue | null {
  const tags = (element.tags as Record<string, string>) ?? {}
  if (!tags.name) return null

  const amenity = tags.amenity ?? tags.leisure ?? "unknown"
  const address = buildAddress(tags)

  return {
    osmId: String(element.id),
    name: tags.name,
    address,
    latitude: element.lat as number,
    longitude: element.lon as number,
    venueType: amenity,
    tags,
  }
}

function buildAddress(tags: Record<string, string>): string {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"],
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : "Adresse non disponible"
}
