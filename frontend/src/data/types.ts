/**
 * Shape of hakeem-data.json, produced by scripts/build_data.py from the
 * challenge data pack (06 symbiosis in RUH2, 07 compliance in DMM2).
 * All quantities are monthly unless the field says otherwise.
 */

export type Family =
  | "plastics"
  | "metals"
  | "paper"
  | "oils"
  | "minerals"
  | "energy"
  | "water"
  | "chemicals"

export type WasteClass = "General" | "Industrial" | "Hazardous"

export interface City {
  id: string
  name: string
  lat: number
  lon: number
}

/** A factory as the interface may show it: id, name and location are null when it did not consent. */
export interface Factory {
  id: string | null
  key: string
  name: string
  activity: string | null
  isic: string | null
  lat: number | null
  lon: number | null
  city: string
  size: string
  consent: boolean
  hazLicense: string | null
}

export interface Material {
  code: string
  ewc: string | null
  nameAr: string
  nameEn: string
  family: Family
  hazardous: boolean
  unit: string
  canSubstitute: string | null
  maxKm: number | null
}

export interface QualitySpec {
  material: string
  grade: string
  contaminationMax: number | null
  moistureMax: number | null
  note: string | null
}

export interface HazardousRule {
  material: string
  ewc: string
  transportLicense: string
  receiverLicense: string
  manifest: boolean
  prohibited: string
  storage: string | null
}

export interface Provider {
  id: string
  name: string
  service: string
  materials: string[]
  city: string
  licenseExpiry: string
}

export interface Price {
  month: string
  material: string
  virgin: number | null
  secondary: number | null
  source: string
}

export interface Manifest {
  id: string
  month: string
  byproduct: string
  quantity: number
  unit: string
  destination: string
  provider: string | null
  cost: number
}

export interface Exchange {
  id: string
  supplier: string
  receiver: string
  material: string
  start: string
  status: "active" | "stopped"
  stopReason: string | null
}

export interface Byproduct {
  id: string
  factory: string
  /** As the factory wrote it. */
  text: string
  quantity: number
  unit: string
  quality: string | null
  hazardous: boolean
  declaredEwc: string | null
  /** Taxonomy code the classification agent resolved the text to. */
  material: string
  ewc: string | null
  ewcInferred: boolean
  family: Family
  route: string
  /** SAR per unit: negative is a cost, positive is income. */
  routeCost: number
  frequency: string
}

export interface Need {
  id: string
  factory: string
  text: string
  quantity: number
  unit: string
  minQuality: string | null
  acceptsSecondary: boolean
  source: string
  price: number
  spec: string | null
  material: string | null
  family: Family
}

export interface Opportunity {
  id: string
  byproduct: string
  need: string
  supplier: string
  receiver: string
  score: number
  quantity: number
  unit: string
  coverage: number
  distanceKm: number
  maxKm: number
  materialMatch: number
  textSimilarity: number
  qualityOk: boolean
  hazardous: boolean
  receiverLicensed: boolean | null
  valuePerUnit: number
  netValue: number
  co2: number
  landfillDiverted: number
  currentlyLandfilled: boolean
  feasible: boolean
  exclusion: string | null
  compliant: boolean
  rank: number | null
  similarityRank: number | null
  reason: string
}

export interface OpportunityCard {
  factory: string
  role: "supplier" | "receiver" | "both"
  text: string
}

export interface SymbiosisSummary {
  pairs: number
  feasible: number
  excludedCompliance: number
  excludedMaterial: number
  monthlySavings: number
  annualSavings: number
  landfillDiverted: number
  co2: number
  precisionAgent: number
  precisionText: number
}

export interface Symbiosis {
  cities: City[]
  city: string
  factories: Factory[]
  taxonomy: Material[]
  qualitySpecs: QualitySpec[]
  hazardousRules: HazardousRule[]
  providers: Provider[]
  prices: Price[]
  manifests: Manifest[]
  exchanges: Exchange[]
  byproducts: Byproduct[]
  needs: Need[]
  opportunities: Opportunity[]
  cards: OpportunityCard[]
  summary: SymbiosisSummary
}

export interface Facility {
  id: string
  city: string
  activity: string
  isic: string
  lat: number
  lon: number
  hazGenerator: boolean
  lastInspection: string
  violations12m: number
}

export interface WasteRecord {
  id: string
  facility: string
  date: string
  text: string
  photo: boolean
  declared: WasteClass
  tons: number
  declaredEwc: string | null
  container: string | null
  /** Model probability that the waste is hazardous. */
  pHazardous: number
  predicted: WasteClass
  confidence: number
  review: boolean
  /** The agent expects a riskier class than the one declared. */
  misdeclared: boolean
  requirements: string | null
}

export interface WasteSubclass {
  id: string
  class: WasteClass
  name: string
  ewc: string
  transportLicense: string
  allowedSites: string[]
  container: string
  maxStorageDays: number | null
}

export interface TripPoints {
  weight: number
  classification: number
  site: number
  license: number
  stop: number
  tracker: number
  deviation: number
  dumping: number
}

export interface Trip {
  id: string
  vehicle: string
  record: string
  declared: WasteClass
  predicted: WasteClass
  loaded: number
  delivered: number
  site: string | null
  depart: string
  arrive: string
  transporter: string
  stopMinutes: number
  trackerGapMinutes: number
  deviation: number
  points: TripPoints
  score: number
  suspicious: boolean
  rank: number | null
  droneLinked: boolean
  gateNet: number | null
  reasons: string[]
}

export interface GpsPoint {
  vehicle: string
  time: string
  lat: number
  lon: number
  speed: number
  ignition: boolean
  signal: boolean
}

export interface Site {
  id: string
  name: string
  lat: number
  lon: number
  accepts: WasteClass[]
  geofenceM: number
  weighbridge: boolean
}

export interface Vehicle {
  id: string
  transporter: string
  type: string
  capacity: number
  hazLicensed: boolean
  gps: boolean
}

export interface Transporter {
  id: string
  name: string
  licenses: string[]
  licenseExpiry: string
  violations12m: number
}

export interface Geofence {
  id: string
  type: string
  name: string
}

export interface DroneObservation {
  id: string
  time: string
  lat: number
  lon: number
  label: string
  areaM2: number
  confidence: number
}

export interface Generation {
  facility: string
  month: string
  class: WasteClass
  declared: number
  productionIndex: number
  expected: number
}

export interface InspectionCase {
  id: string
  trip: string
  score: number
  rank: number
  predicted: WasteClass
  confidence: number
  action: string
  review: boolean
}

export interface Compliance {
  city: string
  date: string
  facilities: Facility[]
  records: WasteRecord[]
  wasteClasses: WasteSubclass[]
  trips: Trip[]
  gps: GpsPoint[]
  gpsTrip: string
  sites: Site[]
  vehicles: Vehicle[]
  transporters: Transporter[]
  geofences: Geofence[]
  drone: DroneObservation[]
  generation: Generation[]
  cases: InspectionCase[]
  weights: Record<string, number>
  thresholds: Record<string, number>
  recommendations: string[]
}

export interface HakeemData {
  source: string
  symbiosis: Symbiosis
  compliance: Compliance
}
