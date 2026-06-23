export interface UserPreferenceInput {
  budget: number
  dietaryRestrictions: DietaryRestriction[]
  venueTypes: VenueType[]
  latitude: number
  longitude: number
}

export type DietaryRestriction =
  | "vegetarian"
  | "vegan"
  | "halal"
  | "kosher"
  | "gluten-free"
  | "none"

export type VenueType =
  | "restaurant"
  | "bar"
  | "cafe"
  | "nightclub"
  | "cinema"
  | "bowling"
  | "escape_game"

export interface OsmVenue {
  osmId: string
  name: string
  address: string
  latitude: number
  longitude: number
  venueType: string
  tags: Record<string, string>
}

export interface ScoredVenue extends OsmVenue {
  score: number
  compatibilityReasons: string[]
}

export interface MatchingRequest {
  groupId: string
  sessionId: string
  preferences: UserPreferenceInput[]
  venues: OsmVenue[]
}

export interface MatchingResult {
  recommendations: ScoredVenue[]
}

export interface VoteUpdate {
  sessionId: string
  recommendationId: string
  voteCount: number
  totalMembers: number
}

export interface Barycenter {
  latitude: number
  longitude: number
}
