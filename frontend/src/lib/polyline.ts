import type { LatLng } from "@/lib/roads"

/**
 * Decodes Google's encoded-polyline format (what OSRM returns, and what
 * scripts/build_map_data.py stores). `precision` is the number of decimals the
 * encoder kept: 6 for the map data, 5 for the older Google format.
 */
export function decodePolyline(text: string, precision = 6): LatLng[] {
  const factor = 10 ** precision
  const points: LatLng[] = []
  let index = 0
  let lat = 0
  let lng = 0
  while (index < text.length) {
    for (const axis of [0, 1] as const) {
      let shift = 0
      let result = 0
      let byte: number
      do {
        byte = text.charCodeAt(index++) - 63
        result |= (byte & 0x1f) << shift
        shift += 5
      } while (byte >= 0x20)
      const delta = result & 1 ? ~(result >> 1) : result >> 1
      if (axis === 0) lat += delta
      else lng += delta
    }
    points.push({ lat: lat / factor, lng: lng / factor })
  }
  return points
}
