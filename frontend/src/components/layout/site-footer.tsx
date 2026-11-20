import { LinkedInIcon } from "@/components/brand/linkedin-icon"
import { TEAM } from "@/lib/site"

/** The team's names, centred, each a link to its LinkedIn profile. Nothing else. */
export function SiteFooter() {
  return (
    <footer className="px-3 pt-2 pb-3 sm:px-4 sm:pb-4">
      <div className="mx-auto max-w-[112rem] rounded-2xl bg-forest px-4 py-3 text-forest-foreground shadow-(--forest-shadow) ring-1 ring-(--forest-edge) backdrop-blur-xl backdrop-saturate-150">
        <ul aria-label="فريق العمل" className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          {TEAM.map((member) => (
            <li key={member.linkedin}>
              <a
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                title={`${member.nameEn} على لينكدإن`}
                className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-base font-medium transition-colors hover:bg-forest-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                <LinkedInIcon className="size-4 shrink-0 text-leaf" />
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
