import { calculateBarycenter } from "@/lib/overpass/barycenter"
import type { UserPreferenceInput } from "@/types"

const makePreference = (lat: number, lng: number): UserPreferenceInput => ({
  latitude: lat,
  longitude: lng,
  budget: 20,
  dietaryRestrictions: [],
  venueTypes: ["restaurant"],
})

describe("calculateBarycenter", () => {
  it("should return the exact point for a single participant", () => {
    const result = calculateBarycenter([makePreference(48.8566, 2.3522)])
    expect(result.latitude).toBeCloseTo(48.8566)
    expect(result.longitude).toBeCloseTo(2.3522)
  })

  it("should return the midpoint for two participants", () => {
    const prefs = [makePreference(48.0, 2.0), makePreference(50.0, 4.0)]
    const result = calculateBarycenter(prefs)
    expect(result.latitude).toBeCloseTo(49.0)
    expect(result.longitude).toBeCloseTo(3.0)
  })

  it("should return the centroid for three participants", () => {
    const prefs = [
      makePreference(48.0, 2.0),
      makePreference(50.0, 4.0),
      makePreference(49.0, 3.0),
    ]
    const result = calculateBarycenter(prefs)
    expect(result.latitude).toBeCloseTo(49.0)
    expect(result.longitude).toBeCloseTo(3.0)
  })

  it("should throw when preferences list is empty", () => {
    expect(() => calculateBarycenter([])).toThrow(
      "Cannot calculate barycenter with no preferences"
    )
  })
})
