import raw from "./map-data.json"
import { decodePolyline } from "@/lib/polyline"
import type { LatLng, RoadRoute } from "@/lib/roads"

/**
 * What the map screens draw besides the basemap: road routes and outlines,
 * built by scripts/build_map_data.py (do not edit map-data.json by hand).
 * Only the two map screens import this, so it stays out of the main bundle.
 */

type RawRoute = {
  path: string
  legs?: string[]
  m: number
  s: number
  traffic?: [number, number, 1 | 2][]
}

export const ROUTES: Record<string, RoadRoute> = Object.fromEntries(
  Object.entries((raw as unknown as { routes: Record<string, RawRoute> }).routes).map(([id, r]) => [
    id,
    {
      path: decodePolyline(r.path),
      legs: (r.legs ?? []).map((leg) => decodePolyline(leg)),
      distanceMeters: r.m,
      durationSeconds: r.s,
      traffic: (r.traffic ?? []).map(([from, to, level]) => ({ from, to, level })),
    } satisfies RoadRoute,
  ])
)

/** The dotted red outline of each factory and facility: a ring of [lng, lat], by factory key or facility id. */
export const OUTLINES = (raw as unknown as { outlines: Record<string, [number, number][]> }).outlines

export function routeFor(id: string): RoadRoute | undefined {
  return ROUTES[id]
}

export function outlineFor(id: string | null | undefined): [number, number][] | undefined {
  return id ? OUTLINES[id] : undefined
}

export type { LatLng }
