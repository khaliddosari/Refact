import { AdvancedMarker } from "@vis.gl/react-google-maps"
import { Truck } from "lucide-react"
import type { ReactNode } from "react"

import type { LatLng } from "@/lib/roads"
import { cn } from "@/lib/utils"

/**
 * Markers are advanced markers whose content is plain HTML in the theme's own
 * classes, so there are no image assets and nothing to restyle per map.
 * Every pin is anchored on its centre (the default anchors the bottom, for
 * teardrop pins).
 */

export type PinRole = "supplier" | "receiver" | "both" | "none"

const ROLE_FILL: Record<PinRole, string> = {
  supplier: "bg-chart-1",
  receiver: "bg-chart-3",
  both: "bg-chart-2",
  none: "bg-cream",
}

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
    <AdvancedMarker
      position={position}
      title={name}
      onClick={onClick}
      zIndex={selected ? 30 : dimmed ? 10 : 20}
      anchorLeft="-50%"
      anchorTop="-50%"
    >
      <div className={cn("relative grid place-items-center transition-opacity", dimmed && "opacity-40")}>
        {selected && (
          <span aria-hidden="true" className="absolute size-11 rounded-full bg-leaf/60 motion-safe:animate-ping" />
        )}
        <span
          className={cn(
            "block rounded-full border-2 shadow-md transition-all",
            selected
              ? "size-7 border-primary bg-leaf ring-4 ring-white"
              : cn("size-[1.15rem] border-white ring-1 ring-primary/40", ROLE_FILL[role])
          )}
        />
        {selected && <MapLabel side={labelSide}>{name}</MapLabel>}
      </div>
    </AdvancedMarker>
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
        "pointer-events-none absolute left-1/2 w-max max-w-56 -translate-x-1/2 rounded-lg bg-popover px-2 py-1 text-center text-xs leading-tight font-bold shadow-(--popup-shadow)",
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
    <AdvancedMarker position={position} zIndex={zIndex} anchorLeft="-50%" anchorTop={above ? "-140%" : "-50%"} clickable={false}>
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
    </AdvancedMarker>
  )
}

/** The vehicle, at its current position on the track. */
export function TruckPin({ position }: { position: LatLng }) {
  return (
    <AdvancedMarker position={position} zIndex={50} anchorLeft="-50%" anchorTop="-50%" clickable={false} title="المركبة">
      <span className="grid size-9 place-items-center rounded-full bg-red-600 text-white shadow-lg ring-4 ring-white">
        <Truck aria-hidden="true" className="size-[1.1rem]" />
      </span>
    </AdvancedMarker>
  )
}

/** A drone sighting: a diamond. Old dumps are grey, fresh finds red. */
export function DronePin({ position, title, old }: { position: LatLng; title: string; old?: boolean }) {
  return (
    <AdvancedMarker position={position} title={title} zIndex={15} anchorLeft="-50%" anchorTop="-50%">
      <span
        className={cn(
          "block size-3.5 rotate-45 rounded-[3px] shadow ring-2 ring-white",
          old ? "bg-stone-500" : "bg-red-800"
        )}
      />
    </AdvancedMarker>
  )
}
