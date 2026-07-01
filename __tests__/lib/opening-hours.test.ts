import { isOpenNow } from "@/lib/matching/opening-hours"

const MONDAY_10AM = new Date(2024, 0, 1, 10, 0) // Lundi 1er janvier 2024, 10h00
const MONDAY_8PM = new Date(2024, 0, 1, 20, 0) // Lundi 1er janvier 2024, 20h00
const SATURDAY_10AM = new Date(2024, 0, 6, 10, 0) // Samedi 6 janvier 2024, 10h00

describe("isOpenNow", () => {
  it("returns isOpen: true for a standard OSM format when now falls within the range", () => {
    const result = isOpenNow("Mo-Fr 09:00-18:00", MONDAY_10AM)
    expect(result.isOpen).toBe(true)
    expect(result.reason).toBe("Ouvert maintenant")
  })

  it("returns isOpen: false for a standard OSM format when now is outside the range", () => {
    const result = isOpenNow("Mo-Fr 09:00-18:00", MONDAY_8PM)
    expect(result.isOpen).toBe(false)
    expect(result.reason).toBe("Fermé actuellement")
  })

  it("returns isOpen: false for a standard OSM format when today isn't covered by any rule", () => {
    const result = isOpenNow("Mo-Fr 09:00-18:00", SATURDAY_10AM)
    expect(result.isOpen).toBe(false)
  })

  it("lets a later rule override an earlier one for the same day (Tu off)", () => {
    const tuesday10am = new Date(2024, 0, 2, 10, 0)
    const result = isOpenNow("Mo-Fr 09:00-18:00; Tu off", tuesday10am)
    expect(result.isOpen).toBe(false)
  })

  it("treats 24/7 as always open regardless of the time", () => {
    expect(isOpenNow("24/7", MONDAY_8PM).isOpen).toBe(true)
    expect(isOpenNow("24/7", SATURDAY_10AM).isOpen).toBe(true)
  })

  it("falls back to free-text heuristics for an unstructured 24/7 mention", () => {
    const result = isOpenNow("Ouvert 24h/24 7j/7", SATURDAY_10AM)
    expect(result.isOpen).toBe(true)
    expect(result.reason).toContain("24/7")
  })

  it("falls back to free-text heuristics for a 'fermé le <jour>' mention matching today", () => {
    const result = isOpenNow("fermé le lundi", MONDAY_10AM)
    expect(result.isOpen).toBe(false)
  })

  it("returns isOpen: null for ambiguous free text with no exploitable signal", () => {
    const result = isOpenNow("Horaires variables, nous contacter", MONDAY_10AM)
    expect(result.isOpen).toBeNull()
  })

  it("returns isOpen: null when the tag is absent", () => {
    const result = isOpenNow(undefined, MONDAY_10AM)
    expect(result.isOpen).toBeNull()
    expect(result.reason).toBe("Horaires inconnus")
  })

  it("returns isOpen: null when the tag is an empty string", () => {
    const result = isOpenNow("   ", MONDAY_10AM)
    expect(result.isOpen).toBeNull()
  })

  it("handles overnight ranges crossing midnight", () => {
    const tuesday1am = new Date(2024, 0, 2, 1, 0)
    const result = isOpenNow("Mo-Su 22:00-02:00", tuesday1am)
    expect(result.isOpen).toBe(true)
  })
})
