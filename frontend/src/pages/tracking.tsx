import { Gauge, Pause, Play, RotateCcw } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router"

import { CityChip, PartyArrow, TripFlags } from "@/components/data-display"
import { TrackingMap } from "@/components/maps/tracking-map"
import { PageHeader } from "@/components/page-header"
import { StatusPill } from "@/components/status-pill"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { COMP, gpsFor, siteById, tripOrigin, tripsByRisk } from "@/data"
import type { GpsPoint, Trip } from "@/data/types"
import { useScrollFade } from "@/hooks/use-scroll-fade"
import { fmt, fmtInt, hhmm } from "@/lib/format"
import { NAV_ITEMS } from "@/lib/nav"
import { cn } from "@/lib/utils"

const minutesOf = (ts: string) => Date.parse(ts.replace(" ", "T")) / 60000

/** Position on the track at a minute offset, interpolated between GPS fixes. */
function positionAt(track: GpsPoint[], minute: number) {
  const t = minutesOf(track[0].time) + minute
  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i]
    const b = track[i + 1]
    const ta = minutesOf(a.time)
    const tb = minutesOf(b.time)
    if (t >= ta && t <= tb) {
      const k = tb === ta ? 0 : (t - ta) / (tb - ta)
      const still = a.lat === b.lat && a.lon === b.lon
      return { lat: a.lat + (b.lat - a.lat) * k, lon: a.lon + (b.lon - a.lon) * k, speed: still ? 0 : a.speed, still }
    }
  }
  const last = track[track.length - 1]
  return { lat: last.lat, lon: last.lon, speed: last.speed, still: false }
}

function clock(track: GpsPoint[], minute: number) {
  const d = new Date((minutesOf(track[0].time) + minute) * 60000)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function destination(t: Trip) {
  return t.site ? (siteById.get(t.site)?.name ?? t.site) : "لم تصل موقعاً معتمداً"
}

export default function TrackingPage() {
  const item = NAV_ITEMS[5]
  const [params, setParams] = useSearchParams()
  const requested = params.get("trip")
  const selected = COMP.trips.find((t) => t.id === requested) ?? COMP.trips.find((t) => t.id === COMP.gpsTrip)!
  const select = (id: string) => setParams({ trip: id }, { replace: true })

  const track = useMemo(() => gpsFor(selected), [selected])
  const total = track.length > 1 ? minutesOf(track[track.length - 1].time) - minutesOf(track[0].time) : 0
  const [minute, setMinute] = useState(0)
  const [playing, setPlaying] = useState(false)

  // A new trip starts its playback from the beginning.
  const [shownTrip, setShownTrip] = useState(selected.id)
  if (shownTrip !== selected.id) {
    setShownTrip(selected.id)
    setMinute(0)
    setPlaying(false)
  }

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setMinute((m) => {
        if (m >= total) {
          setPlaying(false)
          return total
        }
        return m + 1
      })
    }, 140)
    return () => window.clearInterval(id)
  }, [playing, total])

  const at = track.length > 1 ? positionAt(track, minute) : null

  return (
    <>
      <PageHeader icon={item.icon} title={item.label} actions={<CityChip city={COMP.city} />} />

      {/* grid-cols-1 is minmax(0, 1fr): without it the phone column grows to
          the trip list's longest line and the map runs off the screen. */}
      <div className="grid flex-1 grid-cols-1 gap-4 lg:min-h-[34rem] lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Phone: the trips are a swipeable row above the map; lg: a side list. */}
        <TripChips selectedId={selected.id} onSelect={select} />
        <section
          aria-label="الرحلات"
          className="hidden min-h-0 min-w-0 flex-col rounded-2xl bg-card shadow-(--glass-shadow) ring-1 ring-(--glass-edge) backdrop-blur-xl backdrop-saturate-150 lg:flex"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-primary/12 px-4 py-3">
            <h2 className="text-base font-bold">الرحلات</h2>
            <StatusPill label={`${fmtInt(COMP.trips.filter((t) => t.suspicious).length)} مشبوهة`} tone="malfunction" />
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <ul className="flex flex-col gap-1 p-2">
              {tripsByRisk.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => select(t.id)}
                    aria-current={t.id === selected.id ? "true" : undefined}
                    title={`${tripOrigin(t)?.activity ?? t.record} ← ${destination(t)}`}
                    className={cn(
                      "flex h-11 w-full items-center gap-2 rounded-xl px-3 text-start transition-colors",
                      "hover:bg-secondary/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                      t.id === selected.id ? "bg-primary text-primary-foreground hover:bg-primary" : "bg-card/70"
                    )}
                  >
                    <bdi dir="ltr" className="font-mono text-sm font-bold">
                      {t.id}
                    </bdi>
                    <bdi dir="ltr" className={cn("font-mono text-xs", t.id === selected.id ? "opacity-80" : "text-muted-foreground")}>
                      {t.vehicle}
                    </bdi>
                    <span className="ms-auto">
                      <StatusPill label={t.suspicious ? fmt(t.score) : "سليمة"} tone={t.suspicious ? "malfunction" : "done"} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </section>

        {/* On a phone the details follow the map; from lg they float over it. */}
        <div className="relative flex min-w-0 flex-col gap-4 lg:block lg:min-h-0">
          <div className="relative h-[55dvh] min-h-[20rem] lg:absolute lg:inset-0 lg:h-auto lg:min-h-0">
            <TrackingMap selectedId={selected.id} onSelect={select} truckAt={at} className="absolute inset-0 size-full rounded-2xl ring-1 ring-(--glass-edge)" />
            <MapLegend />
          </div>

          <section
            aria-label={`الرحلة ${selected.id}`}
            className="flex flex-col gap-3 rounded-2xl bg-popover p-4 shadow-(--popup-shadow) backdrop-blur-xl backdrop-saturate-150 lg:absolute lg:start-3 lg:bottom-3 lg:z-[500] lg:max-h-[60%] lg:w-[23rem] lg:overflow-y-auto"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold">
                <bdi dir="ltr">{selected.id}</bdi>
              </h2>
              <StatusPill label={selected.suspicious ? "مشبوهة" : "سليمة"} tone={selected.suspicious ? "malfunction" : "done"} />
            </div>
            <PartyArrow from={tripOrigin(selected)?.activity ?? selected.record} to={destination(selected)} className="text-sm" />
            <TripFlags trip={selected} />

            {track.length > 1 && at && (
              <div className="rounded-xl bg-card p-3 ring-1 ring-(--glass-edge)">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      if (!playing && minute >= total) setMinute(0)
                      setPlaying(!playing)
                    }}
                    className="h-10 gap-1.5 rounded-xl px-3 lg:h-9"
                  >
                    {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                    {playing ? "إيقاف" : "تشغيل المسار"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setPlaying(false)
                      setMinute(0)
                    }}
                    className="size-10 rounded-xl p-0 lg:size-9"
                    aria-label="من البداية"
                    title="من البداية"
                  >
                    <RotateCcw aria-hidden="true" />
                  </Button>
                  <span className="ms-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Gauge aria-hidden="true" className="size-3.5 text-primary" />
                    {at.still ? "متوقفة" : `${fmtInt(at.speed)} كم/س`}
                  </span>
                  <bdi dir="ltr" className="text-base font-bold tabular-nums">
                    {clock(track, minute)}
                  </bdi>
                </div>
                <Slider
                  aria-label="موضع المركبة على المسار"
                  value={[minute]}
                  min={0}
                  max={total}
                  step={1}
                  onValueChange={(v) => {
                    setPlaying(false)
                    setMinute(Array.isArray(v) ? v[0] : v)
                  }}
                  className="mt-3"
                />
                <p className="mt-1.5 flex justify-between text-xs text-muted-foreground tabular-nums" dir="ltr">
                  <span>{hhmm(track[0].time)}</span>
                  <span>{hhmm(track[track.length - 1].time)}</span>
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}

function TripChips({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const listRef = useRef<HTMLUListElement>(null)
  const fade = useScrollFade(listRef)

  // Keep the selected trip in view; scroll only the row, never the page.
  useEffect(() => {
    const list = listRef.current
    const current = list?.querySelector<HTMLElement>('[aria-current="true"]')
    if (!list || !current || list.scrollWidth <= list.clientWidth) return
    const row = list.getBoundingClientRect()
    const chip = current.getBoundingClientRect()
    list.scrollBy({ left: chip.left + chip.width / 2 - (row.left + row.width / 2), behavior: "smooth" })
  }, [selectedId])

  return (
    <ul
      ref={listRef}
      {...fade}
      aria-label="الرحلات"
      className="scrollbar-none -mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 py-1 lg:hidden"
    >
      {tripsByRisk.map((t) => {
        const isSelected = t.id === selectedId
        return (
          <li key={t.id} className="shrink-0">
            <button
              type="button"
              onClick={() => onSelect(t.id)}
              aria-current={isSelected ? "true" : undefined}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl px-3 ring-1 transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                isSelected ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-(--glass-edge) backdrop-blur-xl"
              )}
            >
              <bdi dir="ltr" className="font-mono text-sm font-bold">
                {t.id}
              </bdi>
              <StatusPill label={t.suspicious ? fmt(t.score) : "سليمة"} tone={t.suspicious ? "malfunction" : "done"} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function MapLegend() {
  return (
    <ul className="pointer-events-none absolute end-3 top-3 z-[500] hidden flex-col gap-1.5 rounded-xl bg-popover p-3 text-xs shadow-(--popup-shadow) backdrop-blur-xl sm:flex">
      <li className="flex items-center gap-2">
        <span className="size-3 rounded-full bg-primary/20 ring-1 ring-primary" /> موقع معتمد
      </li>
      <li className="flex items-center gap-2">
        <span className="size-3 rounded-full bg-cream ring-2 ring-primary" /> منشأة
      </li>
      <li className="flex items-center gap-2">
        <span className="h-1 w-5 rounded-full bg-red-600" /> مسار GPS
      </li>
      <li className="flex items-center gap-2">
        <span className="h-0 w-5 border-t-2 border-dashed border-red-600" /> مشبوهة
      </li>
      <li className="flex items-center gap-2">
        <span className="h-0 w-5 border-t-2 border-dashed border-stone-500" /> سليمة
      </li>
      <li className="flex items-center gap-2">
        <span className="size-2.5 rotate-45 rounded-[2px] bg-red-800" /> رصد درون
      </li>
    </ul>
  )
}
