import raw from "./refact-data.json"
import type {
  Facility,
  Factory,
  GpsPoint,
  RefactData,
  Opportunity,
  QualitySpec,
  Trip,
} from "./types"

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

export const cityById = index(SYM.cities, "id")
export const factoryByKey = index(SYM.factories, "key")
export const materialByCode = index(SYM.taxonomy, "code")
export const byproductById = index(SYM.byproducts, "id")
export const needById = index(SYM.needs, "id")
export const providerById = index(SYM.providers, "id")
export const facilityById = index(COMP.facilities, "id")
export const recordById = index(COMP.records, "id")
export const siteById = index(COMP.sites, "id")
export const vehicleById = index(COMP.vehicles, "id")
export const transporterById = index(COMP.transporters, "id")
export const caseByTrip = index(COMP.cases, "trip")

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

export function partyId(key: string): string | null {
  const factory = factoryByKey.get(key)
  return factory ? factory.id : key
}

export function factory(key: string): Factory | undefined {
  return factoryByKey.get(key)
}

/** Opportunities the agent ranks, best first. */
export const feasibleOpportunities: Opportunity[] = SYM.opportunities
  .filter((o) => o.feasible)
  .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))

/** Pairs the agent rejected, and why: material mismatch or compliance. */
export const excludedOpportunities: Opportunity[] = SYM.opportunities.filter((o) => !o.feasible)

/**
 * Why a pair was rejected, specific enough to act on: a compliance reason
 * as the data states it, or which material failed to meet which need.
 */
export function exclusionDetail(o: Opportunity) {
  if (o.feasible) return null
  if (!o.compliant || o.materialMatch !== 0) return o.exclusion
  const offered = materialByCode.get(byproductById.get(o.byproduct)?.material ?? "")
  const wanted = materialByCode.get(needById.get(o.need)?.material ?? "")
  return offered && wanted ? `${offered.nameAr} لا تلبي طلب ${wanted.nameAr}` : o.exclusion
}

export function opportunitiesFor(kind: "byproduct" | "need", id: string) {
  return SYM.opportunities.filter((o) => o[kind] === id)
}

export function qualitySpec(material: string | null, grade: string | null): QualitySpec | undefined {
  if (!material || !grade) return undefined
  return SYM.qualitySpecs.find((q) => q.material === material && q.grade === grade)
}

export function manifestsFor(byproductId: string) {
  return SYM.manifests.filter((m) => m.byproduct === byproductId)
}

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

/** Dates in the data pack the screens refer to. */
export const COMPLIANCE_DAY = COMP.date
