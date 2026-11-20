import { Compass } from "lucide-react"
import { Link } from "react-router"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function NotFoundPage() {
  return (
    <Card className="min-h-[22rem] flex-1 justify-center">
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia className="mb-3 grid size-16 place-items-center rounded-2xl bg-secondary text-primary ring-1 ring-primary/10">
            <Compass aria-hidden="true" className="size-8" strokeWidth={1.6} />
          </EmptyMedia>
          <EmptyTitle className="text-lg font-bold">الصفحة غير موجودة</EmptyTitle>
          <EmptyDescription>ربما تغيّر الرابط. اختر أحد الأقسام من الأعلى، أو عد إلى لوحة التحكم.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link to="/" className={cn(buttonVariants(), "h-10 px-4 lg:h-9")}>
            العودة إلى لوحة التحكم
          </Link>
        </EmptyContent>
      </Empty>
    </Card>
  )
}
