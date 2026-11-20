import { Link } from "react-router"

import {
  LOGO_ARABIC,
  LOGO_ENGLISH,
  LOGO_MARK,
  LOGO_MARK_CENTRE,
  LOGO_VIEWBOX,
} from "@/components/brand/logo-art"
import { cn } from "@/lib/utils"

const [, , VIEW_W, VIEW_H] = LOGO_VIEWBOX.split(" ").map(Number)

/**
 * The lockup: the light green recycle mark on the left, the name beside it,
 * Arabic on top and English underneath.
 *
 * It is outlined artwork (logo-art.ts, built by scripts/build_logo.py from
 * Thmanyah Serif Display with every OpenType feature on), measured from the
 * glyph ink so it is flush on every side: the mark is exactly as tall as the
 * two lines, "Hakeem" is spaced to exactly the width of "حكيم", and the SVG's
 * edges are the ink's edges, so whatever centres the logo centres the ink.
 *
 * The mark turns a third of a revolution on hover; the loop has threefold
 * symmetry, so it comes to rest exactly where it started.
 */
export function HakeemLogo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="حكيم، لوحة التحكم"
      className={cn(
        "group inline-flex rounded-lg",
        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf",
        className
      )}
    >
      <svg
        viewBox={LOGO_VIEWBOX}
        aria-hidden="true"
        focusable="false"
        overflow="visible"
        className="h-11 w-auto sm:h-12"
        style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
      >
        <path
          d={LOGO_MARK}
          className="fill-leaf transition-[rotate] duration-500 ease-out motion-safe:group-hover:rotate-[120deg]"
          style={{ transformOrigin: `${LOGO_MARK_CENTRE.x}px ${LOGO_MARK_CENTRE.y}px` }}
        />
        <path d={LOGO_ARABIC} className="fill-forest-foreground" />
        <path d={LOGO_ENGLISH} className="fill-forest-foreground" />
      </svg>
    </Link>
  )
}
