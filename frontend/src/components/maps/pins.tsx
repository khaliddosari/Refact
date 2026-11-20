import { Marker } from "@vis.gl/react-maplibre"
import { Car, Droplets, Flame, Truck } from "lucide-react"
import type { ReactNode } from "react"

import { fmt, fmtDrive } from "@/lib/format"
import { MAP } from "@/lib/map-colors"
import type { LatLng } from "@/lib/roads"
import { cn } from "@/lib/utils"

/**
 * Markers are map markers whose content is plain HTML in the theme's own
 * classes, so there are no image assets and nothing to restyle per map.
 * Every pin is anchored on its centre.
 */

export type PinRole = "supplier" | "receiver" | "both" | "none"

const ROLE_FILL: Record<PinRole, string> = {
  supplier: "bg-chart-1",
  receiver: "bg-chart-3",
  both: "bg-chart-2",
  none: "bg-cream",
}

/** A click on a marker must not also be a click on the map under it. */
const handle = (onClick?: () => void) =>
  onClick
    ? (e: { originalEvent: { stopPropagation: () => void } }) => {
        e.originalEvent.stopPropagation()
        onClick()
      }
    : undefined

/**
 * A factory. The segment shows in the fill (supplier, receiver, both, or in no
 * exchange). Selected, it grows, takes the leaf colour, pulses and carries its
 * name; everything else steps back.
 */
export function FactoryPin({
  position,
  name,
  role = "none",
  selected,
  dimmed,
  labelSide = "top",
  onClick,
}: {
  position: LatLng
  name: string
  role?: PinRole
  selected?: boolean
  dimmed?: boolean
  labelSide?: "top" | "bottom"
  onClick?: () => void
}) {
  return (
    <Marker
      longitude={position.lng}
      latitude={position.lat}
      anchor="center"
      style={{ zIndex: selected ? 30 : dimmed ? 10 : 20 }}
      onClick={handle(onClick)}
    >
      <div title={name} className={cn("relative grid place-items-center transition-opacity", dimmed && "opacity-40", onClick && "cursor-pointer")}>
        {selected && <span aria-hidden="true" className="absolute size-11 rounded-full bg-leaf/60 motion-safe:animate-ping" />}
        <span
          className={cn(
            "block rounded-full border-2 shadow-md transition-all",
            selected ? "size-7 border-primary bg-leaf ring-4 ring-white" : cn("size-[1.15rem] border-white ring-1 ring-primary/40", ROLE_FILL[role])
          )}
        />
        {selected && <MapLabel side={labelSide}>{name}</MapLabel>}
      </div>
    </Marker>
  )
}

/** A short caption on the map: a name, an id, a duration. */
export function MapLabel({
  children,
  side = "top",
  tone = "default",
}: {
  children: ReactNode
  side?: "top" | "bottom"
  tone?: "default" | "alert"
}) {
  return (
    <span
      dir="rtl"
      className={cn(
        "pointer-events-none absolute left-1/2 w-max max-w-40 -translate-x-1/2 rounded-lg bg-popover px-2 py-1 text-center text-xs leading-tight font-bold shadow-(--popup-shadow) sm:max-w-56",
        side === "top" ? "bottom-full mb-3" : "top-full mt-3",
        tone === "alert" ? "text-red-800" : "text-primary"
      )}
    >
      {children}
    </span>
  )
}

/** A label on its own, centred on a point (a site's id, the stop on a route). */
export function LabelMarker({
  position,
  children,
  tone,
  dimmed,
  above,
  zIndex = 5,
}: {
  position: LatLng
  children: ReactNode
  tone?: "default" | "alert"
  dimmed?: boolean
  /** Sit above the point rather than on it (over a circle that is itself the mark). */
  above?: boolean
  zIndex?: number
}) {
  return (
    <Marker
      longitude={position.lng}
      latitude={position.lat}
      anchor="center"
      offset={above ? [0, -30] : [0, 0]}
      style={{ zIndex, pointerEvents: "none" }}
    >
      <span
        dir="rtl"
        className={cn(
          "block w-max rounded-lg bg-popover px-2 py-0.5 text-xs font-bold shadow-(--popup-shadow)",
          tone === "alert" ? "text-red-800" : "text-primary",
          dimmed && "opacity-50"
        )}
      >
        {children}
      </span>
    </Marker>
  )
}

/** The vehicle, at its current position on the track. */
export function TruckPin({ position }: { position: LatLng }) {
  return (
    <Marker longitude={position.lng} latitude={position.lat} anchor="center" style={{ zIndex: 50, pointerEvents: "none" }}>
      <span title="المركبة" className="grid size-9 place-items-center rounded-full bg-red-600 text-white shadow-lg ring-4 ring-white">
        <Truck aria-hidden="true" className="size-[1.1rem]" />
      </span>
    </Marker>
  )
}

/** A drone sighting: a diamond. Old dumps are grey, fresh finds red. */
export function DronePin({ position, title, old }: { position: LatLng; title: string; old?: boolean }) {
  return (
    <Marker longitude={position.lng} latitude={position.lat} anchor="center" style={{ zIndex: 15 }}>
      <span title={title} className={cn("block size-3.5 rotate-45 rounded-[3px] shadow ring-2 ring-white", old ? "bg-stone-500" : "bg-red-800")} />
    </Marker>
  )
}

const BUBBLE_ICON = { drive: Car, heat: Flame, water: Droplets } as const

/**
 * The time and distance on a route, in the blue bubble Google draws on one:
 * the time bold over the distance. A pipe has a distance only.
 */
export function RouteBubble({
  at,
  meters,
  seconds,
  kind = "drive",
}: {
  at: LatLng
  meters: number
  /** Driving time; omitted for a pipe. */
  seconds?: number
  kind?: keyof typeof BUBBLE_ICON
}) {
  const Icon = BUBBLE_ICON[kind]
  const km = `${fmt(meters / 1000)} كم`
  return (
    <Marker longitude={at.lng} latitude={at.lat} anchor="top-left" offset={[10, 6]} style={{ zIndex: 40, pointerEvents: "none" }}>
      <div
        dir="rtl"
        style={{ backgroundColor: MAP.bubble }}
        className="relative flex flex-col gap-1 rounded-md px-2.5 py-1.5 text-white shadow-lg ring-1 ring-white/70"
      >
        <span aria-hidden="true" style={{ backgroundColor: MAP.bubble }} className="absolute -top-1 left-3 size-2.5 rotate-45" />
        {seconds !== undefined ? (
          <>
            <span className="flex items-center gap-1.5 text-sm leading-none font-bold">
              <Icon aria-hidden="true" className="size-4" />
              {fmtDrive(seconds)}
            </span>
            <span className="text-xs leading-none tabular-nums opacity-95">{km}</span>
          </>
        ) : (
          <span className="flex items-center gap-1.5 text-sm leading-none font-bold">
            <Icon aria-hidden="true" className="size-4" />
            {km}
          </span>
        )}
      </div>
    </Marker>
  )
}
