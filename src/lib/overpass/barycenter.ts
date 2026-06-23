import type { Barycenter, UserPreferenceInput } from "@/types"

export function calculateBarycenter(
  preferences: UserPreferenceInput[]
): Barycenter {
  if (preferences.length === 0) {
    throw new Error("Cannot calculate barycenter with no preferences")
  }

  const sum = preferences.reduce(
    (acc, pref) => ({
      latitude: acc.latitude + pref.latitude,
      longitude: acc.longitude + pref.longitude,
    }),
    { latitude: 0, longitude: 0 }
  )

  return {
    latitude: sum.latitude / preferences.length,
    longitude: sum.longitude / preferences.length,
  }
}
