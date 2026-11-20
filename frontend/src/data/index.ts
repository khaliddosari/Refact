import raw from "./refact-data.json"
import type { Facility, GpsPoint, Opportunity, RefactData, Trip } from "./types"

/**
 * The challenge data, typed. Regenerate the JSON with scripts/build_data.py;
 * never edit it by hand. 06 (symbiosis) is set in RUH2, 07 (compliance) in
 * DMM2, on Sunday 18 May 2025.
 */
export const DATA = raw as RefactData
export const SYM = DATA.symbiosis
export const COMP = DATA.compliance

function index<T, K extends keyof T>(items: T[], key: K) {
  return new Map(items.map((item) => [String(item[key]), item]))
}

const cityById = index(SYM.cities, "id")
const factoryByKey = index(SYM.factories, "key")
const providerById = index(SYM.providers, "id")
const facilityById = index(COMP.facilities, "id")
const recordById = index(COMP.records, "id")
export const materialByCode = index(SYM.taxonomy, "code")
export const byproductById = index(SYM.byproducts, "id")
export const siteById = index(COMP.sites, "id")

export function cityName(id: string) {
  return cityById.get(id)?.name ?? id
}

const CITY_SHORT: Record<string, string> = {
  RUH2: "الرياض الثانية",
  DMM2: "الدمام الثانية",
  JED3: "جدة الثالثة",
}

export function cityShort(id: string) {
  return CITY_SHORT[id] ?? cityName(id)
}

/** The city alone, for a phone header row: "الرياض" from "الرياض الثانية". */
export function cityTiny(id: string) {
  return cityShort(id).split(" ")[0]
}

/**
 * A party in an exchange: a factory, a licensed provider, or the scrap
 * dealer the data names generically. Factories without consent come back
 * already anonymised from the build step.
 */
export function partyName(key: string): string {
  const factory = factoryByKey.get(key)
  if (factory) return factory.name
  const provider = providerById.get(key)
  if (provider) return provider.name
  if (key === "SCRAP-DEALER") return "تاجر خردة"
  return key
}

/** The Arabic name of the material an opportunity moves. */
export function materialOf(o: Opportunity) {
  return materialByCode.get(byproductById.get(o.byproduct)?.material ?? "")?.nameAr ?? o.byproduct
}

/** Opportunities the agent ranks, best first. */
export const feasibleOpportunities: Opportunity[] = SYM.opportunities
  .filter((o) => o.feasible)
  .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))

/** Every trip, highest risk first; clean trips after the suspicious ones. */
export const tripsByRisk: Trip[] = [...COMP.trips].sort(
  (a, b) => (a.rank ?? 99) - (b.rank ?? 99) || b.score - a.score
)

export const suspiciousTrips = tripsByRisk.filter((t) => t.suspicious)

export const MAX_TRIP_SCORE = Math.max(...COMP.trips.map((t) => t.score))

export function tripOrigin(trip: Trip): Facility | undefined {
  const record = recordById.get(trip.record)
  return record ? facilityById.get(record.facility) : undefined
}

/** GPS points of the trip that has a recorded track (only one in the sample). */
export function gpsFor(trip: Trip): GpsPoint[] {
  if (trip.id !== COMP.gpsTrip) return []
  return COMP.gps.filter((p) => p.vehicle === trip.vehicle)
}

export function facilityLabel(id: string) {
  const f = facilityById.get(id)
  return f ? `${f.activity}` : id
}
