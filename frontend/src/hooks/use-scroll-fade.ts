import { useCallback, useEffect, useState, type RefObject } from "react"

type Fade = { "data-fade-left"?: ""; "data-fade-right"?: "" }

/**
 * For a horizontal scroller: which physical edges still have content hidden
 * behind them. Spread the result onto the element; index.css fades those
 * edges, so a row of tabs that runs off a phone screen says so.
 *
 * Works in both directions: scrollLeft is 0 at the start edge and grows
 * negative towards the end in RTL, so the distance travelled is its absolute
 * value and the direction decides which side that is.
 */
export function useScrollFade(ref: RefObject<HTMLElement | null>): Fade {
  const [fade, setFade] = useState<Fade>({})

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const travelled = Math.abs(el.scrollLeft)
    const hiddenStart = max > 1 && travelled > 1
    const hiddenEnd = max > 1 && travelled < max - 1
    const rtl = getComputedStyle(el).direction === "rtl"
    const left = rtl ? hiddenEnd : hiddenStart
    const right = rtl ? hiddenStart : hiddenEnd
    setFade((prev) => {
      const next: Fade = {}
      if (left) next["data-fade-left"] = ""
      if (right) next["data-fade-right"] = ""
      const same =
        ("data-fade-left" in prev) === left && ("data-fade-right" in prev) === right
      return same ? prev : next
    })
  }, [ref])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    measure()
    el.addEventListener("scroll", measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      el.removeEventListener("scroll", measure)
      observer.disconnect()
    }
  }, [ref, measure])

  return fade
}
