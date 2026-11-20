import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router/dom"

import "./index.css"
import { DirectionProvider } from "@/components/ui/direction"
import { TooltipProvider } from "@/components/ui/tooltip"
import { router } from "@/router"

// Arabic only: index.html ships lang="ar" dir="rtl", and the components read
// direction from this provider (arrow keys, popup sides), not from the attribute.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DirectionProvider direction="rtl">
      <TooltipProvider delay={200}>
        <RouterProvider router={router} />
      </TooltipProvider>
    </DirectionProvider>
  </StrictMode>
)
