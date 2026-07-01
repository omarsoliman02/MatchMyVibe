import { rankVenues } from "@/lib/matching/score"
import type { OsmVenue, UserPreferenceInput } from "@/types"

const BARYCENTER = { latitude: 48.8566, longitude: 2.3522 }

const makePreference = (overrides: Partial<UserPreferenceInput> = {}): UserPreferenceInput => ({
  latitude: BARYCENTER.latitude,
  longitude: BARYCENTER.longitude,
  budget: 20,
  dietaryRestrictions: [],
  venueTypes: ["restaurant"],
  ...overrides,
})

const makeVenue = (overrides: Partial<OsmVenue> = {}): OsmVenue => ({
  osmId: "osm-1",
  name: "Le Lieu",
  address: "1 rue Test",
  latitude: BARYCENTER.latitude,
  longitude: BARYCENTER.longitude,
  venueType: "restaurant",
  tags: {},
  ...overrides,
})

describe("rankVenues", () => {
  it("returns an empty array when there are no venues", () => {
    expect(rankVenues(BARYCENTER, [makePreference()], [], 3)).toEqual([])
  })

  it("adds a budget bonus and a compatibility reason when the estimated price is within budget (fee=no)", () => {
    const preferences = [makePreference({ budget: 20 })]
    const cheap = makeVenue({ osmId: "cheap", tags: { fee: "no" } })
    const noSignal = makeVenue({ osmId: "no-signal", tags: {} })

    const [scoredCheap] = rankVenues(BARYCENTER, preferences, [cheap], 1)
    const [scoredNoSignal] = rankVenues(BARYCENTER, preferences, [noSignal], 1)

    expect(scoredCheap.score).toBeGreaterThan(scoredNoSignal.score)
    expect(scoredCheap.compatibilityReasons).toContain("Gratuit ✓")
  })

  it("adds a budget bonus when the charge tag price is at or under the group's average budget", () => {
    const preferences = [makePreference({ budget: 20 }), makePreference({ budget: 20 })]
    const venue = makeVenue({ tags: { charge: "15 EUR" } })

    const [scored] = rankVenues(BARYCENTER, preferences, [venue], 1)

    expect(scored.compatibilityReasons.some((r) => r.startsWith("Budget respecté"))).toBe(true)
  })

  it("does not add a budget bonus or reason when the estimated price exceeds the group's average budget", () => {
    const preferences = [makePreference({ budget: 20 }), makePreference({ budget: 20 })]
    const venue = makeVenue({ tags: { charge: "50 EUR" } })

    const [scored] = rankVenues(BARYCENTER, preferences, [venue], 1)

    expect(scored.compatibilityReasons.some((r) => r.includes("Budget") || r.includes("Gratuit"))).toBe(false)
  })

  it("stays neutral on budget when no reliable price tag is present", () => {
    const preferences = [makePreference({ budget: 20 })]
    const venue = makeVenue({ tags: {} })

    const [scored] = rankVenues(BARYCENTER, preferences, [venue], 1)

    expect(scored.compatibilityReasons.some((r) => r.includes("Budget") || r.includes("Gratuit"))).toBe(false)
  })

  it("boosts the score for the venue type requested by the group", () => {
    const preferences = [makePreference({ venueTypes: ["bar"] })]
    const bar = makeVenue({ osmId: "bar", venueType: "bar" })
    const restaurant = makeVenue({ osmId: "restaurant", venueType: "restaurant" })

    const scored = rankVenues(BARYCENTER, preferences, [restaurant, bar], 2)
    const scoredBar = scored.find((v) => v.osmId === "bar")!
    const scoredRestaurant = scored.find((v) => v.osmId === "restaurant")!

    expect(scoredBar.score).toBeGreaterThan(scoredRestaurant.score)
  })

  it("boosts the score for venues matching a requested dietary restriction", () => {
    const preferences = [makePreference({ dietaryRestrictions: ["vegan"] })]
    const veganFriendly = makeVenue({ osmId: "vegan", tags: { "diet:vegan": "yes" } })
    const notVegan = makeVenue({ osmId: "not-vegan", tags: {} })

    const scored = rankVenues(BARYCENTER, preferences, [notVegan, veganFriendly], 2)
    const scoredVegan = scored.find((v) => v.osmId === "vegan")!
    const scoredNotVegan = scored.find((v) => v.osmId === "not-vegan")!

    expect(scoredVegan.score).toBeGreaterThan(scoredNotVegan.score)
  })

  it("clamps the score to 1 and limits/sorts the results", () => {
    const preferences = [makePreference({ venueTypes: ["restaurant"], dietaryRestrictions: ["vegan"], budget: 20 })]
    const perfect = makeVenue({
      osmId: "perfect",
      venueType: "restaurant",
      tags: { "diet:vegan": "yes", fee: "no" },
    })
    const far = makeVenue({ osmId: "far", latitude: 10, longitude: 10 })

    const scored = rankVenues(BARYCENTER, preferences, [far, perfect], 1)

    expect(scored).toHaveLength(1)
    expect(scored[0].osmId).toBe("perfect")
    expect(scored[0].score).toBeLessThanOrEqual(1)
  })
})
