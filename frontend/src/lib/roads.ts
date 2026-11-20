import type { GpsPoint } from "@/data/types"

export type LatLng = { lat: number; lng: number }

/** A stretch of a route drawn orange (1, slow) or red (2, heavy): points `from` to `to`, inclusive. */
export type TrafficRun = { from: number; to: number; level: 1 | 2 }

/** A driving route along real roads, from src/data/map.ts. */
export type RoadRoute = {
  /** Origin to destination, following the roads. */
  path: LatLng[]
  /** A recorded track has one path per leg; a leg ends at every stop. Empty for other routes. */
  legs: LatLng[][]
  distanceMeters: number
  /** Driving time, with the delay of the traffic on it. */
  durationSeconds: number
  traffic: TrafficRun[]
}

/* Geometry */

const rad = (deg: number) => (deg * Math.PI) / 180

/** Great-circle distance in metres. */
export function distance(a: LatLng, b: LatLng) {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** The point a fraction (0 to 1) of the way along a path, by length. */
export function pointAlong(path: LatLng[], fraction: number): LatLng {
  if (path.length === 1) return path[0]
  const lengths = path.slice(1).map((p, i) => distance(path[i], p))
  const total = lengths.reduce((sum, n) => sum + n, 0)
  if (total === 0) return path[0]
  let remaining = Math.min(1, Math.max(0, fraction)) * total
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const k = lengths[i] === 0 ? 0 : Math.min(1, remaining / lengths[i])
      return {
        lat: path[i].lat + (path[i + 1].lat - path[i].lat) * k,
        lng: path[i].lng + (path[i + 1].lng - path[i].lng) * k,
      }
    }
    remaining -= lengths[i]
  }
  return path[path.length - 1]
}

/** A circle as a closed ring of [lng, lat] points: a geofence, or the spot a vehicle stood. */
export function circleRing(center: LatLng, radiusMeters: number, steps = 72): [number, number][] {
  const dLat = radiusMeters / 111_320
  const dLng = dLat / Math.cos(rad(center.lat))
  const ring: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const angle = (2 * Math.PI * i) / steps
    ring.push([center.lng + dLng * Math.cos(angle), center.lat + dLat * Math.sin(angle)])
  }
  return ring
}

/**
 * Where a route turns: the vertices where the heading changes by `minTurn`
 * degrees over about 90 m, at least `spacing` metres apart and clear of the
 * ends. They are the white dots on a route.
 */
export function turnPoints(path: LatLng[], minTurn = 55, spacing = 260): LatLng[] {
  if (path.length < 3) return []
  const along = [0]
  for (let i = 1; i < path.length; i++) along.push(along[i - 1] + distance(path[i - 1], path[i]))
  const total = along[along.length - 1]
  const bearing = (a: LatLng, b: LatLng) => {
    const dx = (b.lng - a.lng) * Math.cos(rad((a.lat + b.lat) / 2))
    return (Math.atan2(dx, b.lat - a.lat) * 180) / Math.PI
  }
  const dots: LatLng[] = []
  let last = -Infinity
  for (let i = 1; i < path.length - 1; i++) {
    if (along[i] < 140 || along[i] > total - 140 || along[i] - last < spacing) continue
    let before = i
    while (before > 0 && along[i] - along[before] < 45) before--
    let after = i
    while (after < path.length - 1 && along[after] - along[i] < 45) after++
    let turn = Math.abs(bearing(path[i], path[after]) - bearing(path[before], path[i]))
    if (turn > 180) turn = 360 - turn
    if (turn >= minTurn) {
      dots.push(path[i])
      last = along[i]
    }
  }
  return dots
}

export type Bounds = { north: number; south: number; east: number; west: number }

/**
 * The box around some points, never smaller than `minSpan` degrees on a side
 * (about 700 m at 0.006): two factories 900 m apart should not zoom the map
 * down to street level.
 */
export function boundsOf(points: LatLng[], minSpan = 0.006): Bounds {
  let north = -90
  let south = 90
  let east = -180
  let west = 180
  for (const p of points) {
    north = Math.max(north, p.lat)
    south = Math.min(south, p.lat)
    east = Math.max(east, p.lng)
    west = Math.min(west, p.lng)
  }
  const padLat = Math.max(0, (minSpan - (north - south)) / 2)
  const padLng = Math.max(0, (minSpan - (east - west)) / 2)
  return { north: north + padLat, south: south - padLat, east: east + padLng, west: west - padLng }
}

/* A recorded GPS track, snapped to the roads */

const STILL = (a: GpsPoint, b: GpsPoint) => a.lat === b.lat && a.lon === b.lon

/**
 * The distinct stops of a recorded track. A vehicle that sits still repeats
 * one fix; as a route it is a single stop. `stopOfFix[i]` says which stop fix
 * i belongs to.
 */
export function trackStops(points: GpsPoint[]) {
  const stops: LatLng[] = []
  const stopOfFix: number[] = []
  points.forEach((p, i) => {
    if (i === 0 || !STILL(points[i - 1], p)) stops.push({ lat: p.lat, lng: p.lon })
    stopOfFix.push(stops.length - 1)
  })
  return { stops, stopOfFix }
}

const fixTime = (p: GpsPoint) => Date.parse(p.time.replace(" ", "T")) / 60000

/**
 * Where the vehicle is `minute` minutes into the track. On a snapped track it
 * follows the road between two fixes by the share of time elapsed; sitting
 * still, it stays on its stop. Without a snapped route it moves in straight
 * lines between the fixes.
 */
export function positionOnTrack(points: GpsPoint[], minute: number, snapped?: RoadRoute | null) {
  const t = fixTime(points[0]) + minute
  const { stops, stopOfFix } = trackStops(points)
  // A snapped route is only usable if it has one leg between each pair of stops.
  const usable = snapped && snapped.legs.length === stops.length - 1 ? snapped : null
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const ta = fixTime(a)
    const tb = fixTime(b)
    if (t < ta || t > tb) continue
    const still = STILL(a, b)
    const k = tb === ta ? 0 : (t - ta) / (tb - ta)
    const leg = usable?.legs[stopOfFix[i]]
    let at: LatLng
    if (still) {
      at = leg?.[0] ?? { lat: a.lat, lng: a.lon }
    } else if (leg && leg.length > 0) {
      at = pointAlong(leg, k)
    } else {
      at = { lat: a.lat + (b.lat - a.lat) * k, lng: a.lon + (b.lon - a.lon) * k }
    }
    return { ...at, speed: still ? 0 : a.speed, still }
  }
  const last = points[points.length - 1]
  return { lat: last.lat, lng: last.lon, speed: last.speed, still: false }
}
