/** The team, shown in the footer. Each name links to its LinkedIn profile. */
export const TEAM = [
  {
    name: "خالد آل دوسري",
    nameEn: "Khalid Al Dosari",
    linkedin: "https://www.linkedin.com/in/khalid-al-dosari",
  },
  {
    name: "محمد الحواس",
    nameEn: "Mohammed Alhawas",
    linkedin: "https://www.linkedin.com/in/mohammed-alhawas-594b2238b",
  },
  {
    name: "خالد الدويش",
    nameEn: "Khalid Aldawish",
    linkedin: "https://www.linkedin.com/in/khalid-aldawish-037b7723a",
  },
] as const

/**
 * Who is signed in, shown in the header on wide screens. The data pack sends
 * the agents' recommendations to MODON's team, who introduce the factories
 * to each other, and ranks transport cases for its inspectors; so the demo
 * is that team's view, across the two cities the data covers.
 */
export const CURRENT_USER = {
  name: "فريق مدن",
  detail: "التكافل الصناعي والامتثال البيئي",
} as const

/**
 * Latin digits and the Gregorian calendar, in Arabic. A house decision made
 * once: `ar-SA` alone gives Hijri dates and Arabic-Indic digits.
 */
export const LOCALE = "ar-SA-u-ca-gregory-nu-latn"
