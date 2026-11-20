import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * The glass section shell: a header (title, caption, something at the end
 * such as a status pill) over a body. Header shrink-0 and body min-h-0 so a
 * panel can sit in a locked grid cell later (the map screens) and scroll
 * inside instead of stretching.
 */
export function Panel({
  title,
  caption,
  aside,
  children,
  className,
  bodyClassName,
}: {
  title: string
  caption?: string
  aside?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-col rounded-2xl bg-card text-card-foreground shadow-(--glass-shadow) ring-1 ring-(--glass-edge) backdrop-blur-xl backdrop-saturate-150",
        className
      )}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-primary/12 px-4 pt-3.5 pb-3 sm:px-5">
        <div className="min-w-0 flex-1 basis-48">
          <h2 className="text-base leading-snug font-bold">{title}</h2>
          {caption && <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      <div className={cn("flex min-h-0 flex-1 flex-col p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  )
}
