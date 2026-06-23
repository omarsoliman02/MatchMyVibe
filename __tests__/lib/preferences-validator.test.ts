import { validatePreference } from "@/lib/auth/preferences-validator"

describe("validatePreference", () => {
  const validInput = {
    budget: 30,
    dietaryRestrictions: ["vegetarian"],
    venueTypes: ["restaurant"],
    latitude: 48.8566,
    longitude: 2.3522,
  }

  it("should accept a valid preference", () => {
    const result = validatePreference(validInput)
    expect(result.budget).toBe(30)
    expect(result.latitude).toBe(48.8566)
  })

  it("should reject a negative budget", () => {
    expect(() => validatePreference({ ...validInput, budget: -10 })).toThrow()
  })

  it("should reject a budget above 500", () => {
    expect(() => validatePreference({ ...validInput, budget: 1000 })).toThrow()
  })

  it("should reject empty venueTypes array", () => {
    expect(() =>
      validatePreference({ ...validInput, venueTypes: [] })
    ).toThrow("At least one venue type required")
  })

  it("should reject an invalid dietary restriction", () => {
    expect(() =>
      validatePreference({ ...validInput, dietaryRestrictions: ["pescatarian"] })
    ).toThrow()
  })

  it("should reject invalid latitude", () => {
    expect(() =>
      validatePreference({ ...validInput, latitude: 200 })
    ).toThrow()
  })

  it("should reject invalid longitude", () => {
    expect(() =>
      validatePreference({ ...validInput, longitude: -200 })
    ).toThrow()
  })

  it("should accept multiple dietary restrictions", () => {
    const result = validatePreference({
      ...validInput,
      dietaryRestrictions: ["vegetarian", "gluten-free"],
    })
    expect(result.dietaryRestrictions).toHaveLength(2)
  })
})
