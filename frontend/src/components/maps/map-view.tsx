import { ColorScheme, Map, useMap } from "@vis.gl/react-google-maps"
import { MapPinOff } from "lucide-react"
import { useEffect, type ReactNode } from "react"

import { MAPS_KEY, MAP_ID } from "@/components/maps/maps-provider"
import type { Bounds } from "@/lib/roads"
import { cn } from "@/lib/utils"

/**
 * The map surface every screen shares.
 *
 * - `dir="ltr"`: maps never mirror; Arabic labels inside set their own dir.
 * - `isolate`: keeps Google's panes (z-indexes up to the thousands) under the
 *   sticky header instead of sliding over it.
 * - gestureHandling "cooperative" asks for two fingers (or Ctrl + scroll), so
 *   a map inside a scrolling page never traps the scroll; "greedy" is for a
 *   map that is the page.
 * - Only the zoom buttons are left on: no map-type, street-view or
 *   fullscreen controls to explain, and POIs are not clickable.
 */
export function MapView({
  bounds,
  label,
  className,
  children,
  gesture = "cooperative",
}: {
  /** The area the map opens on. */
  bounds: Bounds
  /** Accessible name for the map region. */
  label: string
  className?: string
  children?: ReactNode
  gesture?: "cooperative" | "greedy"
}) {
  if (!MAPS_KEY) return <MapKeyMissing label={label} className={className} />
  return (
    <div
      dir="ltr"
      role="region"
      aria-label={label}
      className={cn("map-surface relative isolate overflow-hidden rounded-xl bg-muted", className)}
    >
      <Map
        mapId={MAP_ID}
        defaultBounds={{ ...bounds, padding: 40 }}
        gestureHandling={gesture}
        colorScheme={ColorScheme.LIGHT}
        disableDefaultUI
        zoomControl
        clickableIcons={false}
        keyboardShortcuts
        className="size-full"
      >
        {children}
      </Map>
    </div>
  )
}

/** Moves the view when what it should frame changes (a selection, a trip). */
export function FitBounds({
  north,
  south,
  east,
  west,
  padding = 56,
}: Bounds & { padding?: number | google.maps.Padding }) {
  const map = useMap()
  const pad = typeof padding === "number" ? `${padding}` : `${padding.top}/${padding.right}/${padding.bottom}/${padding.left}`
  useEffect(() => {
    if (!map) return
    map.fitBounds({ north, south, east, west }, padding)
    // `pad` is the padding's value; the object itself is new on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, north, south, east, west, pad])
  return null
}

/** What the map screens show until a Google Maps key is set. */
function MapKeyMissing({ label, className }: { label: string; className?: string }) {
  return (
    <div
      role="region"
      aria-label={label}
      className={cn(
        "grid place-items-center rounded-xl bg-muted/70 p-6 text-center ring-1 ring-(--glass-edge)",
        className
      )}
    >
      <div className="flex max-w-xs flex-col items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
          <MapPinOff aria-hidden="true" className="size-6" />
        </span>
        <p className="text-sm font-bold">مفتاح Google Maps غير مضبوط</p>
        <p dir="ltr" className="rounded-lg bg-card px-3 py-2 font-mono text-xs break-all">
          VITE_GOOGLE_MAPS_API_KEY
        </p>
        <p className="text-xs text-muted-foreground">
          <span dir="ltr">frontend/.env.local</span>
        </p>
      </div>
    </div>
  )
}
