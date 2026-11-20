import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

/** Title block at the top of every tab: icon tile, title, optional actions at the end. */
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: LucideIcon
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-3 lg:mb-6 desk:mb-3 desk:shrink-0 desk:gap-y-2">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-(--glass-shadow) ring-1 ring-white/10 desk:size-10">
        <Icon aria-hidden="true" className="size-6 desk:size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl leading-tight font-bold sm:text-3xl desk:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
