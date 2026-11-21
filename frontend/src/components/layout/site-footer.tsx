import { LinkedInIcon } from "@/components/brand/linkedin-icon"
import { TEAM } from "@/lib/site"

/**
 * The team's names, centred, each a link to its LinkedIn profile. Nothing else.
 * The three names always share one line: on a phone the type scales with the
 * screen (13px at 360px wide) instead of letting the last name drop to a
 * second row, and below 360px the LinkedIn marks give up their room to the
 * names; from sm they wrap again if they ever have to.
 */
export function SiteFooter() {
  return (
    <footer className="px-3 pt-2 pb-3 sm:px-4 sm:pb-4 desk:shrink-0 desk:pt-0 desk:pb-3">
      <div className="mx-auto max-w-[112rem] rounded-2xl bg-forest px-2 py-3 text-forest-foreground shadow-(--forest-shadow) ring-1 ring-(--forest-edge) backdrop-blur-xl backdrop-saturate-150 sm:px-4 desk:py-1.5">
        <ul aria-label="فريق العمل" className="flex items-center justify-center gap-x-0.5 sm:flex-wrap sm:gap-x-2 sm:gap-y-1">
          {TEAM.map((member) => (
            <li key={member.linkedin}>
              <a
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                title={`${member.nameEn} على لينكدإن`}
                className="inline-flex h-10 items-center gap-1 rounded-xl px-1 text-[length:clamp(0.6875rem,3.6vw,1rem)] font-medium whitespace-nowrap transition-colors hover:bg-forest-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf sm:gap-2 sm:px-3 sm:text-base desk:h-9"
              >
                <LinkedInIcon className="hidden size-3.5 shrink-0 text-leaf min-[22.5rem]:block sm:size-4" />
                <span>{member.name}</span>
                <span className="sr-only">(لينكدإن، يفتح في نافذة جديدة)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}
