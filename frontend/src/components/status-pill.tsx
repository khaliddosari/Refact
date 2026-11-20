import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * Four states, always colour plus dot plus word, so colour is never the only
 * cue. These are the only saturated colours in the interface:
 *   idle         nothing happening yet   (new, queued, scheduled)
 *   running      something in flight     (awaiting approval, evaluating)
 *   done         finished well           (approved, delivered)
 *   malfunction  needs a human           (flagged risk, referred to a specialist)
 */
export type Tone = "idle" | "running" | "done" | "malfunction"

const toneClass: Record<Tone, string> = {
  idle: "bg-stone-100 text-stone-700 border-stone-300",
  running: "bg-blue-100 text-blue-900 border-blue-300",
  done: "bg-green-100 text-green-900 border-green-300",
  malfunction: "bg-red-100 text-red-900 border-red-300",
}

const dotClass: Record<Tone, string> = {
  idle: "bg-stone-400",
  running: "bg-blue-600",
  done: "bg-green-600",
  malfunction: "bg-red-600",
}

export function StatusPill({
  label,
  tone,
  className,
}: {
  label: string
  tone: Tone
  className?: string
}) {
  return (
    <Badge variant="outline" className={cn("h-6 shrink-0 gap-1.5 px-2.5 text-xs", toneClass[tone], className)}>
      <span aria-hidden="true" className="relative flex size-1.5">
        {tone === "running" && (
          <span
            className={cn(
              "absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping",
              dotClass[tone]
            )}
          />
        )}
        <span className={cn("relative inline-flex size-1.5 rounded-full", dotClass[tone])} />
      </span>
      {label}
    </Badge>
  )
}
