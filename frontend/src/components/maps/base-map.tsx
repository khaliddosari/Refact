import "leaflet/dist/leaflet.css"

import L, { type LatLngBoundsExpression, type LatLngExpression } from "leaflet"
import { useEffect, type ReactNode } from "react"
import { MapContainer, TileLayer, useMap } from "react-leaflet"

import { cn } from "@/lib/utils"

/**
 * The map surface every screen shares.
 *
 * - `dir="ltr"`: maps never mirror; Arabic labels inside set their own dir.
 * - `isolate`: Leaflet's panes carry z-indexes up to 1000; without a
 *   stacking context of their own they would slide over the sticky header.
 * - OpenStreetMap's standard tiles (free with attribution, local Arabic
 *   names), washed toward the cream palette in index.css so green routes and
 *   red alerts carry the colour. Needs a connection.
 */
export function BaseMap({
  bounds,
  children,
  className,
  scrollWheelZoom = false,
  label,
}: {
  bounds: LatLngBoundsExpression
  children?: ReactNode
  className?: string
  scrollWheelZoom?: boolean
  /** Accessible name for the map region. */
  label: string
}) {
  return (
    <div
      dir="ltr"
      role="region"
      aria-label={label}
      className={cn("hakeem-map relative isolate overflow-hidden rounded-xl bg-muted", className)}
    >
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [28, 28] }}
        scrollWheelZoom={scrollWheelZoom}
        className="size-full"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">مساهمو OpenStreetMap</a>'
          maxZoom={19}
        />
        {children}
      </MapContainer>
    </div>
  )
}

/** Moves the view when what it should frame changes (a selection, a filter). */
export function FitBounds({ bounds, maxZoom = 16 }: { bounds: LatLngBoundsExpression | null; maxZoom?: number }) {
  const map = useMap()
  const key = bounds ? JSON.stringify(bounds) : ""
  useEffect(() => {
    if (!bounds) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    map.flyToBounds(bounds, { padding: [48, 48], maxZoom, duration: reduce ? 0 : 0.6 })
    // key captures the bounds' value; the array itself is new on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map, maxZoom])
  return null
}

/** A marker drawn with HTML and the theme's classes, no image assets. */
export function htmlIcon(html: string, size: number, anchor: "center" | "bottom" = "center") {
  return L.divIcon({
    className: "",
    html,
    iconSize: [size, size],
    iconAnchor: anchor === "center" ? [size / 2, size / 2] : [size / 2, size],
  })
}

export function boundsOf(points: LatLngExpression[]): LatLngBoundsExpression {
  return L.latLngBounds(points).pad(0.02)
}
