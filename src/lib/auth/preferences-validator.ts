import { z } from "zod"

export const userPreferenceSchema = z.object({
  budget: z.number().int().positive().max(500),
  dietaryRestrictions: z.array(
    z.enum(["vegetarian", "vegan", "halal", "kosher", "gluten-free", "none"])
  ),
  venueTypes: z
    .array(
      z.enum([
        "restaurant",
        "bar",
        "cafe",
        "nightclub",
        "cinema",
        "bowling",
        "escape_game",
      ])
    )
    .min(1, "At least one venue type required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

export type ValidatedPreference = z.infer<typeof userPreferenceSchema>

export function validatePreference(input: unknown): ValidatedPreference {
  return userPreferenceSchema.parse(input)
}
