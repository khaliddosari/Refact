import { Link } from "react-router"

import { LOGO_MARK, LOGO_MARK_CENTRE, LOGO_NAME, LOGO_VIEWBOX } from "@/components/brand/logo-art"
import { BRAND_NAME } from "@/lib/nav"
import { cn } from "@/lib/utils"

const [, , VIEW_W, VIEW_H] = LOGO_VIEWBOX.split(" ").map(Number)

/**
 * The lockup: the light green recycle mark on the left, ريفاكت beside it.
 *
 * It is outlined artwork (logo-art.ts, built by scripts/build_logo.py from
 * Thmanyah Serif Display with every OpenType feature on), measured from the
 * glyph ink so it is flush on every side: the mark is exactly as tall as the
 * name's ink, and the SVG's edges are the ink's edges, so whatever centres the
 * logo centres the ink.
 *
 * The name is a long word next to a mark of the same height, so the lockup is
 * wide (about 5:1). The heights step down at lg, where the tabs and the logo
 * share one row (a full set of six needs the room), and up again at xl.
 *
 * The mark turns a third of a revolution on hover; the loop has threefold
 * symmetry, so it comes to rest exactly where it started.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label={`${BRAND_NAME}، الصفحة الرئيسية`}
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
        className="h-10 w-auto lg:h-8 xl:h-11"
        style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
      >
        <path
          d={LOGO_MARK}
          className="fill-leaf transition-[rotate] duration-500 ease-out motion-safe:group-hover:rotate-[120deg]"
          style={{ transformOrigin: `${LOGO_MARK_CENTRE.x}px ${LOGO_MARK_CENTRE.y}px` }}
        />
        <path d={LOGO_NAME} className="fill-forest-foreground" />
      </svg>
    </Link>
  )
}
